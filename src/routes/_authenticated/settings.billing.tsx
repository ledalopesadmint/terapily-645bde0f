import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, CreditCard, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Badge } from "@/components/ui/badge";
import { TRIAL_DURATION_DAYS } from "@/lib/constants";
import {
  createBillingPortalSession,
  createCheckoutSession,
  getActiveProducts,
  getCurrentSubscription,
} from "@/features/billing/billing.functions";
import { deriveTrialStatus } from "@/features/billing/trial-status";
import { TrialExpiredBanner } from "@/features/billing/TrialExpiredBanner";
import { toast } from "sonner";

const searchSchema = z.object({
  checkout: z.enum(["success", "cancelled"]).optional(),
});

export const Route = createFileRoute("/_authenticated/settings/billing")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Cobrança · Ajustes · Terapily" }],
  }),
  component: BillingSettingsPage,
});

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function BillingSettingsPage() {
  const { workspace } = useAuth();
  const { checkout } = useSearch({ from: "/_authenticated/settings/billing" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["billing", "products"],
    queryFn: () => getActiveProducts(),
  });

  const subscriptionQuery = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => getCurrentSubscription(),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const subscription = subscriptionQuery.data?.subscription ?? null;
  // "Ativo" = assinatura paga via Stripe (status active OU trialing pago no
  // Stripe, que sempre traz stripe_subscription_id). O trial NATIVO de 14 dias
  // do app é tier=solo + status=trialing SEM stripe_subscription_id — esse não
  // conta como ativo, pra continuar mostrando os planos disponíveis.
  const isActive =
    !!subscription?.stripe_subscription_id &&
    (subscription.status === "active" || subscription.status === "trialing");

  // Após retornar do Stripe (?checkout=success), faz polling até o webhook
  // confirmar a subscription — em geral leva 1-3s.
  const pollAttempts = useRef(0);
  useEffect(() => {
    if (checkout !== "success" || isActive) return;
    pollAttempts.current = 0;
    const interval = setInterval(() => {
      pollAttempts.current += 1;
      void queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] });
      if (pollAttempts.current >= 15) clearInterval(interval); // ~30s
    }, 2000);
    return () => clearInterval(interval);
  }, [checkout, isActive, queryClient]);

  // Limpa ?checkout=... da URL assim que confirmamos o estado real.
  // Evita que mensagens de "cancelado" persistam entre refreshes,
  // especialmente quando o usuário já tem assinatura ativa de outra sessão.
  useEffect(() => {
    if (!checkout) return;
    if (checkout === "cancelled" || (checkout === "success" && isActive)) {
      void navigate({
        to: "/settings/billing",
        search: {},
        replace: true,
      });
    }
  }, [checkout, isActive, navigate]);

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) =>
      createCheckoutSession({ data: { priceId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Não foi possível abrir o checkout.");
    },
  });
  const pendingPriceId = checkoutMutation.isPending
    ? (checkoutMutation.variables as string | undefined)
    : null;

  const portalMutation = useMutation({
    mutationFn: () => createBillingPortalSession(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Não foi possível abrir o portal.");
    },
  });

  const trialEndsAt = workspace?.trial_ends_at
    ? new Date(workspace.trial_ends_at)
    : null;
  const daysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null;
  const trialEndDate = trialEndsAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(trialEndsAt)
    : null;
  const trialStatus = deriveTrialStatus({
    trialEndsAt: workspace?.trial_ends_at,
    subscriptionStatus: subscription?.status,
    stripeSubscriptionId: subscription?.stripe_subscription_id,
  });

  const products = productsQuery.data?.products ?? [];

  const tierLabel =
    subscription?.tier === "practice"
      ? "Practice"
      : subscription?.tier === "basic"
        ? "Basic"
        : "Plano";

  const renewalDate = subscription?.current_period_end
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(subscription.current_period_end))
    : null;

  return (
    <section className="space-y-8">
      <div>
        <Eyebrow>Cobrança</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-foreground">
          {isActive ? "Seu plano." : "Sua avaliação e seu plano."}
        </h2>
      </div>

      {checkout === "success" && !isActive && (
        <div className="flex items-start gap-3 rounded-lg border border-secondary/40 bg-secondary/10 p-4 text-sm text-foreground">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-secondary" aria-hidden />
          <p>
            Pagamento recebido. Estamos confirmando com o Stripe — leva alguns
            segundos. Esta página atualiza sozinha.
          </p>
        </div>
      )}
      {checkout === "cancelled" && !isActive && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Checkout cancelado. Nada foi cobrado.
        </div>
      )}

      {/* Plano ativo — substitui card de trial */}
      {isActive && (
        <div className="rounded-xl border border-secondary/50 bg-secondary/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Eyebrow tone="sage">Plano ativo</Eyebrow>
              <p className="mt-3 font-display text-2xl text-foreground">
                Terapily {tierLabel}
                {subscription?.status === "trialing" && (
                  <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                    · período de teste pago
                  </span>
                )}
              </p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {renewalDate && (
                  <p>
                    {subscription.cancel_at_period_end
                      ? `Cancela em ${renewalDate}.`
                      : `Próxima cobrança em ${renewalDate}.`}
                  </p>
                )}
                {subscription?.stripe_payment_method_brand &&
                  subscription?.stripe_payment_method_last4 && (
                    <p className="capitalize">
                      {subscription.stripe_payment_method_brand} ••••{" "}
                      {subscription.stripe_payment_method_last4}
                    </p>
                  )}
              </div>
            </div>
            <CheckCircle2
              className="h-8 w-8 shrink-0 text-secondary"
              aria-hidden
            />
          </div>
        </div>
      )}

      {/* Upgrade Basic → Practice */}
      {isActive && subscription?.tier === "basic" && (() => {
        const practice = products.find((p) => p.tier === "practice");
        if (!practice) return null;
        const isUpgrading = pendingPriceId === practice.stripe_price_id;
        return (
          <div className="rounded-xl border border-mauve/40 bg-gradient-to-br from-mauve/5 to-transparent p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Eyebrow tone="mauve">Pronta pra mais?</Eyebrow>
                <p className="mt-3 font-display text-2xl text-foreground">
                  Suba pro Practice por {formatPrice(practice.unit_amount, practice.currency)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /{practice.interval === "month" ? "mês" : practice.interval}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {practice.nickname}. A diferença é cobrada proporcional ao
                  período restante — sem taxa de troca.
                </p>
              </div>
              <button
                type="button"
                onClick={() => checkoutMutation.mutate(practice.stripe_price_id)}
                disabled={checkoutMutation.isPending}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
              >
                {isUpgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Fazer upgrade
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Trial ativo — só quando NÃO há assinatura paga */}
      {!isActive && daysLeft !== null && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Eyebrow tone="sage">Avaliação ativa</Eyebrow>
              <p className="mt-3 font-display text-2xl text-foreground">
                {daysLeft === 0
                  ? "Último dia da avaliação."
                  : daysLeft === 1
                    ? "1 dia restante."
                    : `${daysLeft} dias restantes.`}
              </p>
              {trialEndDate && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Sua avaliação de {TRIAL_DURATION_DAYS} dias termina em{" "}
                  {trialEndDate}.
                </p>
              )}
            </div>
            <CreditCard
              className="h-8 w-8 shrink-0 text-secondary"
              aria-hidden
            />
          </div>
        </div>
      )}

      {/* Planos — escondidos quando já existe assinatura ativa */}
      {!isActive && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl text-foreground">
              Escolha seu plano
            </h3>
            <Badge
              variant="outline"
              className="border-secondary/40 text-secondary-foreground"
            >
              Test mode
            </Badge>
          </div>

          {productsQuery.isLoading && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">
              Carregando planos…
            </div>
          )}

          {productsQuery.isSuccess && products.length === 0 && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">
              Nenhum plano cadastrado ainda. Os preços serão configurados antes
              da ativação real.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((p) => (
              <article
                key={p.stripe_price_id}
                className="rounded-xl border border-border bg-card p-6 transition hover:border-secondary/60"
              >
                <Eyebrow tone={p.tier === "practice" ? "mauve" : "sage"}>
                  {p.tier === "practice" ? "Practice" : "Basic"}
                </Eyebrow>
                <p className="mt-3 font-display text-3xl text-foreground">
                  {formatPrice(p.unit_amount, p.currency)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /{p.interval === "month" ? "mês" : p.interval}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.nickname}
                </p>

                <button
                  type="button"
                  onClick={() => checkoutMutation.mutate(p.stripe_price_id)}
                  disabled={checkoutMutation.isPending}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
                >
                  {pendingPriceId === p.stripe_price_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      Assinar
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
      {/* Gerenciar assinatura */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Gerenciar assinatura
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cancele, troque o cartão ou veja faturas no portal seguro do
              Stripe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => portalMutation.mutate(undefined)}
            disabled={portalMutation.isPending}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            {portalMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <>
                Abrir portal
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Dúvidas sobre cobrança?{" "}
        <a
          href="mailto:contato@terapily.com"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Escreva pra gente
        </a>
        .
      </p>
    </section>
  );
}
