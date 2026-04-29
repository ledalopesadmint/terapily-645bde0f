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
 *   - invoice.payment_succeeded / payment_failed
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
  await supabaseAdmin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
    workspace_id: workspaceId,
  });
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

async function tierFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;
  const { data } = await supabaseAdmin
    .from("stripe_products")
    .select("tier")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data?.tier ?? null;
}

async function syncSubscription(
  workspaceId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const tier = (await tierFromPriceId(priceId)) ?? undefined;
  const periodEndUnix =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    item?.current_period_end ??
    null;

  const update: Record<string, unknown> = {
    provider: "stripe",
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: mapStatus(sub.status),
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null,
  };
  if (tier) update.tier = tier;

  await supabaseAdmin
    .from("subscriptions")
    .update(update)
    .eq("workspace_id", workspaceId);
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

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as Stripe.Checkout.Session;
              workspaceId =
                (s.metadata?.workspace_id as string | undefined) ??
                (typeof s.customer === "string"
                  ? await workspaceFromCustomer(s.customer)
                  : null);
              if (workspaceId && typeof s.customer === "string") {
                await supabaseAdmin
                  .from("subscriptions")
                  .update({
                    stripe_customer_id: s.customer,
                    provider: "stripe",
                  })
                  .eq("workspace_id", workspaceId);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              workspaceId = await workspaceFromSubscription(sub);
              if (workspaceId) await syncSubscription(workspaceId, sub);
              break;
            }
            case "invoice.payment_succeeded":
            case "invoice.payment_failed": {
              const inv = event.data.object as Stripe.Invoice;
              const customer = inv.customer;
              if (typeof customer === "string") {
                workspaceId = await workspaceFromCustomer(customer);
              }
              break;
            }
            default:
              // Outros eventos: só marcamos como processados.
              break;
          }

          await markProcessed(event, workspaceId);

          await recordAudit({
            actorId: null,
            workspaceId,
            action: `billing.webhook.${event.type}`,
            resourceType: "stripe_event",
            resourceId: event.id,
            metadata: { type: event.type },
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
