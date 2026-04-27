import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Badge } from "@/components/ui/badge";
import { TRIAL_DURATION_DAYS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/settings/billing")({
  head: () => ({
    meta: [{ title: "Cobrança · Ajustes · Terapily" }],
  }),
  component: BillingSettingsPage,
});

/**
 * /settings/billing — STUB honesto da S1.
 *
 * Billing real (LemonSqueezy/Stripe) chega na S2 (provider-agnostic).
 * Aqui mostramos o status do trial vivo e desativamos qualquer ação de
 * cobrança — sem checkout fake.
 */
function BillingSettingsPage() {
  const { workspace } = useAuth();

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

  return (
    <section className="space-y-8">
      <div>
        <Eyebrow>Cobrança</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-foreground">
          Sua avaliação e seu plano.
        </h2>
      </div>

      {/* Trial ativo */}
      {daysLeft !== null && (
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

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full bg-secondary"
                aria-hidden
              />
              Sem cobrança automática
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mauve" aria-hidden />
              Você escolhe quando ativar
            </span>
          </div>
        </div>
      )}

      {/* Planos — STUB */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                Planos e cobrança
              </p>
              <Badge
                variant="outline"
                className="border-secondary/40 text-secondary-foreground"
              >
                Em breve · Semana 2
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Vamos abrir os planos com checkout integrado e portal de
              autosserviço. Você poderá cancelar a qualquer momento, sem ligação.
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled
            className="inline-flex h-9 shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-muted px-4 text-sm font-medium text-muted-foreground"
          >
            Ver planos
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
