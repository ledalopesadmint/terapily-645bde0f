/**
 * Billing server functions — Stripe BYOK (S2).
 *
 * Expõe:
 *   - createCheckoutSession(priceId): cria Stripe Checkout pro workspace atual
 *   - createBillingPortalSession(): abre Customer Portal pra cancelar/atualizar
 *   - getActiveProducts(): lista price_ids cadastrados em stripe_products
 *
 * Todas exigem usuário autenticado E owner do workspace (RLS + checagem).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stripe, getAppOrigin } from "./stripe.server";
import { recordAudit } from "@/features/audit/audit.server";

function originFromRequest(): string {
  try {
    const origin = getRequestHeader("origin");
    if (origin) return origin;
  } catch {
    /* fora de request */
  }
  return getAppOrigin();
}

/**
 * Retorna a subscription atual do workspace do usuário (se existir).
 * Usado pela UI pra saber se o trial virou plano pago.
 */
export const getCurrentSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) return { subscription: null };

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "tier, status, current_period_end, cancel_at_period_end, stripe_payment_method_brand, stripe_payment_method_last4, stripe_price_id",
      )
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle();

    return { subscription: sub ?? null };
  });

/**
 * Lista produtos ativos (Basic / Practice). Usado pela tela de planos.
 */
export const getActiveProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("stripe_products")
      .select(
        "id, stripe_price_id, tier, nickname, unit_amount, currency, interval, limits",
      )
      .eq("active", true)
      .order("unit_amount", { ascending: true });
    if (error) throw new Error(error.message);
    return { products: data ?? [] };
  });

/**
 * Cria uma Stripe Checkout Session pro workspace atual.
 * Reusa o stripe_customer_id se já existir na subscription.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        priceId: z.string().min(3).max(255),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Busca workspace onde o user é owner
    const { data: membership, error: memberErr } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id, role, workspaces(id, name)")
      .eq("user_id", userId)
      .eq("role", "owner")
      .is("deleted_at", null)
      .maybeSingle();

    if (memberErr || !membership) {
      throw new Error("Workspace não encontrado ou você não é owner.");
    }

    const workspaceId = membership.workspace_id;

    // Valida que o priceId existe no nosso catálogo (defesa em profundidade)
    const { data: product, error: prodErr } = await supabaseAdmin
      .from("stripe_products")
      .select("stripe_price_id, tier")
      .eq("stripe_price_id", data.priceId)
      .eq("active", true)
      .maybeSingle();
    if (prodErr || !product) {
      throw new Error("Plano inválido.");
    }

    // Busca subscription atual pra reusar customer
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // Email do user (pra criar customer)
    const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userInfo?.user?.email ?? undefined;

    let customerId = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe().customers.create({
        email,
        metadata: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("workspace_id", workspaceId);
    }

    const origin = originFromRequest();

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: data.priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          tier: product.tier,
        },
      },
      metadata: {
        workspace_id: workspaceId,
        tier: product.tier,
      },
    });

    await recordAudit({
      actorId: userId,
      workspaceId,
      action: "billing.checkout.created",
      resourceType: "stripe_checkout_session",
      resourceId: session.id,
      metadata: { tier: product.tier },
    });

    if (!session.url) {
      throw new Error("Stripe não retornou URL de checkout.");
    }
    return { url: session.url };
  });

/**
 * Abre Stripe Customer Portal pro owner gerenciar/cancelar a assinatura.
 */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .is("deleted_at", null)
      .maybeSingle();
    if (!membership) {
      throw new Error("Você precisa ser owner do workspace pra gerenciar a cobrança.");
    }

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      throw new Error(
        "Sem cobrança ativa ainda. Escolha um plano primeiro.",
      );
    }

    const origin = originFromRequest();
    const portal = await stripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/settings/billing`,
    });

    await recordAudit({
      actorId: userId,
      workspaceId: membership.workspace_id,
      action: "billing.portal.opened",
      resourceType: "stripe_customer",
      resourceId: sub.stripe_customer_id,
    });

    return { url: portal.url };
  });
