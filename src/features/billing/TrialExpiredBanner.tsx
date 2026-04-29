import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock } from "lucide-react";
import { Eyebrow } from "@/components/brand/Eyebrow";

interface TrialExpiredBannerProps {
  /** Variante "compact" pro topo de páginas internas; "full" pro dashboard. */
  variant?: "compact" | "full";
}

/**
 * Banner persistente para `trial_expired`.
 *
 * Apenas comunicação — NÃO bloqueia nenhuma funcionalidade.
 * O gating real (bloqueio de novos pacientes, downgrade controlado) fica pra S6.
 * Ver docs/technical-debt.md §5 e docs/roadmap.md.
 */
export function TrialExpiredBanner({ variant = "full" }: TrialExpiredBannerProps) {
  return (
    <section
      role="region"
      aria-label="Período de teste encerrado"
      className={
        variant === "full"
          ? "rounded-xl border border-mauve/40 bg-mauve/10 p-6 sm:p-8"
          : "rounded-lg border border-mauve/40 bg-mauve/10 p-5"
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mauve/25 sm:flex">
            <Clock className="h-5 w-5 text-mauve" aria-hidden />
          </div>
          <div>
            <Eyebrow tone="mauve">Avaliação encerrada</Eyebrow>
            <p
              className={
                variant === "full"
                  ? "mt-3 font-display text-2xl text-foreground sm:text-3xl"
                  : "mt-2 font-display text-xl text-foreground"
              }
            >
              Seu período de teste terminou.
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Você pode continuar usando com limitações ou fazer upgrade para
              liberar mais pacientes e recursos.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to="/settings/billing"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            Fazer upgrade
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            to="/settings/billing"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </section>
  );
}
