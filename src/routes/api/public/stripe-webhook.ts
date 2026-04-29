/**
 * Stripe webhook — /api/public/stripe-webhook
 *
 * - Verifica assinatura usando STRIPE_WEBHOOK_SECRET (whsec_...).
 * - Idempotência via tabela stripe_events (PK = event.id).
 * - Atualiza public.subscriptions com status/tier/period_end vindos do Stripe.
 *
 * Eventos tratados:
 *   - checkout.session.completed
 *   - customer.subscription.created / updated / deleted
 *   - customer.subscription.trial_will_end (audit-only, prepara aviso futuro)
 *   - invoice.payment_succeeded / payment_failed
 *   - charge.dispute.created (audit-only, prepara painel admin)
 */
import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { stripe } from "@/features/billing/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordAudit } from "@/features/audit/audit.server";

type SubStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

type AppSubStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";

function mapStatus(s: Stripe.Subscription.Status): AppSubStatus {
  const map: Record<SubStatus, AppSubStatus> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    unpaid: "past_due",
    paused: "paused",
  };
  return map[s as SubStatus] ?? "past_due";
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("stripe_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  return !!data;
}

async function markProcessed(
  event: Stripe.Event,
  workspaceId: string | null,
): Promise<void> {
  await supabaseAdmin.from("stripe_events").insert([
    {
      id: event.id,
      type: event.type,
      payload: event as never,
      workspace_id: workspaceId,
    },
  ]);
}

async function workspaceFromCustomer(
  customerId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("workspace_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

async function workspaceFromSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = sub.metadata?.workspace_id;
  if (fromMeta) return fromMeta;
  if (typeof sub.customer === "string") {
    return workspaceFromCustomer(sub.customer);
  }
  return null;
}

/**
 * Resolve workspace_id a partir de um Stripe.Dispute.
 * Tenta: charge.payment_intent.invoice.customer → charge.invoice.customer → charge.customer.
 * Retorna null se não conseguir resolver (caller decide retry).
 */
async function workspaceFromDispute(
  dispute: Stripe.Dispute,
): Promise<string | null> {
  try {
    const chargeId =
      typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
    if (!chargeId) return null;

    const charge = await stripe().charges.retrieve(chargeId);
    const customerId =
      typeof charge.customer === "string"
        ? charge.customer
        : charge.customer?.id ?? null;
    if (customerId) {
      const ws = await workspaceFromCustomer(customerId);
      if (ws) return ws;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve o tier para um priceId consultando o catálogo local.
 * IMPORTANTE: NÃO filtra por `active = true`. Plans/prices antigos podem
 * estar inactive (ex: downgrade Practice → Basic, plan grandfathered),
 * mas precisamos manter a capacidade de mapear o tier correto a partir do
 * histórico salvo em stripe_products.
 *
 * Retorno:
 *   - { found: true, tier }  → price existe no catálogo local.
 *   - { found: false }       → price desconhecido. Caller deve pedir retry
 *                              em eventos críticos de subscription, e nunca
 *                              gravar `tier = null` silenciosamente.
 */
async function tierFromPriceId(
  priceId: string | null | undefined,
): Promise<
  | { found: true; tier: string }
  | { found: false }
> {
  if (!priceId) return { found: false };
  const { data } = await supabaseAdmin
    .from("stripe_products")
    .select("tier")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  if (!data?.tier) return { found: false };
  return { found: true, tier: data.tier };
}

/**
 * Sincroniza public.subscriptions com o estado vindo do Stripe.
 * Lança erro se:
 *   - o priceId não puder ser resolvido contra o catálogo local
 *     (caller deve devolver 500 sem markProcessed pra Stripe reentregar)
 *   - o UPDATE no banco falhar
 *
 * Nunca grava `tier = null` silenciosamente.
 */
async function syncSubscription(
  workspaceId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;

  const tierResult = await tierFromPriceId(priceId);
  if (!tierResult.found) {
    throw new Error(
      `unknown_price_id:${priceId ?? "null"}`,
    );
  }

  const periodEndUnix =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    item?.current_period_end ??
    null;

  const update: Record<string, unknown> = {
    provider: "stripe",
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    tier: tierResult.tier,
    status: mapStatus(sub.status),
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null,
  };

  const { error: updErr } = await supabaseAdmin
    .from("subscriptions")
    .update(update as never)
    .eq("workspace_id", workspaceId);

  if (updErr) {
    throw new Error(`subscriptions_update_failed:${updErr.code ?? "unknown"}`);
  }
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET ausente");
          return new Response("Webhook not configured", { status: 500 });
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) {
          return new Response("Missing signature", { status: 400 });
        }

        const body = await request.text();
        let event: Stripe.Event;
        try {
          event = await stripe().webhooks.constructEventAsync(body, sig, secret);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "invalid signature";
          console.error("[stripe-webhook] signature verify failed:", msg);
          return new Response(`Webhook Error: ${msg}`, { status: 400 });
        }

        if (await alreadyProcessed(event.id)) {
          return new Response("ok (duplicate)", { status: 200 });
        }

        let workspaceId: string | null = null;
        let extraAudit:
          | { action: string; metadata: Record<string, unknown> }
          | null = null;

        // Eventos críticos que MUITO precisam de workspace_id resolvido.
        // Se não resolver, devolvemos 500 SEM marcar como processado pra
        // Stripe reentregar (evita "ghost paid plan").
        const CRITICAL_EVENTS = new Set([
          "checkout.session.completed",
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
        ]);

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as Stripe.Checkout.Session;
              workspaceId =
                (s.metadata?.workspace_id as string | undefined) ??
                (typeof s.customer === "string"
                  ? await workspaceFromCustomer(s.customer)
                  : null);

              // Update do customer_id é OBRIGATÓRIO. Se falhar, devolve 500
              // sem markProcessed pra Stripe reentregar — não pode existir
              // assinatura ativa no Stripe sem espelho local.
              if (workspaceId && typeof s.customer === "string") {
                const { error: updErr } = await supabaseAdmin
                  .from("subscriptions")
                  .update({
                    stripe_customer_id: s.customer,
                    provider: "stripe",
                  })
                  .eq("workspace_id", workspaceId);
                if (updErr) {
                  console.error(
                    JSON.stringify({
                      level: "error",
                      op: "stripe_webhook.checkout_completed_update_failed",
                      code: updErr.code ?? "unknown",
                      msg: "failed to attach customer_id to subscription",
                      event_id: event.id,
                    }),
                  );
                  return new Response(
                    "checkout customer attach failed, retry later",
                    { status: 500 },
                  );
                }
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              workspaceId = await workspaceFromSubscription(sub);
              if (workspaceId) {
                // syncSubscription pode lançar (price desconhecido, update falha).
                // Capturamos no catch externo → 500 sem markProcessed.
                await syncSubscription(workspaceId, sub);
              }
              break;
            }
            case "invoice.payment_succeeded": {
              const inv = event.data.object as Stripe.Invoice;
              const customer = inv.customer;
              if (typeof customer === "string") {
                workspaceId = await workspaceFromCustomer(customer);
              }
              break;
            }
            case "invoice.payment_failed": {
              const inv = event.data.object as Stripe.Invoice;
              const customer = inv.customer;
              if (typeof customer === "string") {
                workspaceId = await workspaceFromCustomer(customer);
              }
              // Status real (past_due/unpaid) é refletido por
              // customer.subscription.updated. Aqui só audit estruturado
              // pra suporte/admin futuro. Metadata 100% PII-safe — só IDs
              // Stripe e números, sem email/nome/cartão/endereço.
              // Stripe novo: invoice.subscription foi removido. Tentamos:
              //   1) parent.subscription_details.subscription (faturas geradas por subscription)
              //   2) line item .subscription (fallback)
              type InvParent = {
                subscription_details?: {
                  subscription?: string | { id?: string } | null;
                } | null;
              };
              const parentSub = (inv as unknown as { parent?: InvParent | null })
                .parent?.subscription_details?.subscription;
              const lineSub = (
                inv.lines?.data?.[0] as unknown as {
                  subscription?: string | { id?: string } | null;
                } | undefined
              )?.subscription;
              const rawSub = parentSub ?? lineSub ?? null;
              const subId =
                typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
              extraAudit = {
                action: "billing.payment_failed",
                metadata: {
                  invoice_id: inv.id ?? null,
                  stripe_subscription_id: subId,
                  amount_due: inv.amount_due ?? null,
                  currency: inv.currency ?? null,
                  attempt_count: inv.attempt_count ?? null,
                  next_payment_attempt: inv.next_payment_attempt ?? null,
                },
              };
              break;
            }
            case "customer.subscription.trial_will_end": {
              const sub = event.data.object as Stripe.Subscription;
              workspaceId = await workspaceFromSubscription(sub);
              // Audit-only. Não altera status. Aviso ao usuário virá em outra iteração.
              extraAudit = {
                action: "billing.trial_will_end",
                metadata: {
                  stripe_subscription_id: sub.id,
                  trial_end: sub.trial_end ?? null,
                },
              };
              break;
            }
            case "charge.dispute.created": {
              const dispute = event.data.object as Stripe.Dispute;
              workspaceId = await workspaceFromDispute(dispute);
              if (!workspaceId) {
                // Não conseguimos atribuir a um workspace. Devolve 500 SEM
                // marcar como processado pra Stripe reentregar — não perdemos
                // o sinal de chargeback.
                console.error(
                  JSON.stringify({
                    level: "error",
                    op: "stripe_webhook.dispute_unresolved",
                    code: "workspace_unresolved",
                    msg: "dispute without workspace_id, requesting retry",
                    event_id: event.id,
                  }),
                );
                return new Response(
                  "workspace_id unresolved for dispute, retry later",
                  { status: 500 },
                );
              }
              const chargeId =
                typeof dispute.charge === "string"
                  ? dispute.charge
                  : dispute.charge?.id ?? null;
              extraAudit = {
                action: "billing.dispute_created",
                metadata: {
                  stripe_dispute_id: dispute.id,
                  stripe_charge_id: chargeId,
                  amount: dispute.amount,
                  currency: dispute.currency,
                  reason: dispute.reason,
                  status: dispute.status,
                },
              };
              break;
            }
            default:
              // Outros eventos: só marcamos como processados.
              break;
          }

          if (CRITICAL_EVENTS.has(event.type) && !workspaceId) {
            console.error(
              "[stripe-webhook] critical event sem workspace_id — pedindo retry",
              { eventId: event.id, type: event.type },
            );
            // NÃO marca processado. Stripe reentrega com backoff.
            return new Response(
              "workspace_id unresolved, retry later",
              { status: 500 },
            );
          }

          await markProcessed(event, workspaceId);

          await recordAudit({
            actorId: null,
            workspaceId,
            action: extraAudit?.action ?? `billing.webhook.${event.type}`,
            resourceType: "stripe_event",
            resourceId: event.id,
            metadata: extraAudit?.metadata ?? { type: event.type },
          });

          return new Response("ok", { status: 200 });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          console.error("[stripe-webhook] handler error:", msg, {
            eventId: event.id,
            type: event.type,
          });
          // Não marca como processado pra Stripe reentregar
          return new Response(`Handler error: ${msg}`, { status: 500 });
        }
      },
    },
  },
});
