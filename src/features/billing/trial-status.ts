/**
 * Helper client-side pra derivar o estado do trial sem novas chamadas server.
 *
 * Regra (espelha `plan.server.ts#trial_expired`):
 *   trial_expired = (subscription.status === 'trialing'
 *                    && subscription.stripe_subscription_id == null  // não é trial pago Stripe
 *                    && trial_ends_at < now())
 *
 * IMPORTANTE: este helper é APENAS comunicação visual — não faz gating, não muda
 * status no banco, não bloqueia nada. O gating real fica pra S6
 * (ver docs/technical-debt.md §5 e docs/roadmap.md).
 */

export type TrialStatus = "active" | "expired" | "paid" | "no_trial";

export interface TrialStatusInput {
  trialEndsAt: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  stripeSubscriptionId: string | null | undefined;
}

export function deriveTrialStatus({
  trialEndsAt,
  subscriptionStatus,
  stripeSubscriptionId,
}: TrialStatusInput): TrialStatus {
  // Tem assinatura paga (mesmo trialing pago via Stripe) → não tratamos como trial nativo.
  if (
    subscriptionStatus === "active" ||
    (subscriptionStatus === "trialing" && stripeSubscriptionId)
  ) {
    return "paid";
  }

  if (!trialEndsAt) return "no_trial";

  const ends = new Date(trialEndsAt).getTime();
  if (Number.isNaN(ends)) return "no_trial";

  return ends < Date.now() ? "expired" : "active";
}

export function trialDaysLeft(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const ends = new Date(trialEndsAt).getTime();
  if (Number.isNaN(ends)) return null;
  return Math.max(0, Math.ceil((ends - Date.now()) / (1000 * 60 * 60 * 24)));
}
