/**
 * InSessionQuickAccess — seção destaque no Acervo.
 *
 * Mostra preview das primeiras escalas do seed + link "Ver todas"
 * que leva pra /library/scales com as 33 escalas do banco.
 *
 * O bloco inteiro é clicável (hover com elevação sutil).
 */

import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Play } from "lucide-react";
import type { Activity as ActivityType } from "./library.types";

interface InSessionQuickAccessProps {
  activities: ActivityType[];
  onStartInSession: (activity: ActivityType) => void;
}

export function InSessionQuickAccess({
  activities,
  onStartInSession,
}: InSessionQuickAccessProps) {
  const inSessionScales = activities.filter(
    (a) =>
      a.archetype === "quiz_scale" &&
      a.supportedModes.includes("in_session"),
  );

  if (inSessionScales.length === 0) return null;

  const sorted = [...inSessionScales].sort((a, b) => {
    const aOnly = a.supportedModes.length === 1 && a.supportedModes[0] === "in_session";
    const bOnly = b.supportedModes.length === 1 && b.supportedModes[0] === "in_session";
    if (aOnly && !bOnly) return -1;
    if (!aOnly && bOnly) return 1;
    return a.code.localeCompare(b.code);
  });

  // Show only first 6 as preview
  const preview = sorted.slice(0, 6);

  return (
    <section aria-labelledby="in-session-title" className="mx-auto max-w-6xl px-4 sm:px-8">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-7">
        <Link
          to="/library/scales"
          className="group mb-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--navy)] text-cream">
              <Activity className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
                Acervo
              </p>
              <h2
                id="in-session-title"
                className="font-display text-xl text-foreground sm:text-2xl"
              >
                Escalas validadas
              </h2>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Ver todas
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
        <p className="mb-4 text-sm text-muted-foreground max-w-xl">
          Selecione, escolha o paciente e comece. Score automático ao final.
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((scale) => {
            const isExclusive =
              scale.supportedModes.length === 1 &&
              scale.supportedModes[0] === "in_session";
            return (
              <button
                key={scale.id}
                onClick={() => onStartInSession(scale)}
                className="
                  group/card flex items-center gap-3.5 rounded-xl border border-border/50
                  bg-background p-3.5 text-left
                  transition-all duration-200
                  hover:border-[var(--sage)]/60 hover:shadow-sm hover:-translate-y-px
                "
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--navy)]/8 text-[var(--navy)] transition-colors group-hover/card:bg-[var(--sage)]/15 group-hover/card:text-[var(--sage)]">
                  <Play className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {scale.code}
                    </span>
                    {isExclusive && (
                      <span className="inline-flex items-center rounded-full bg-[var(--navy)]/10 px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-[var(--navy)]">
                        Só em sessão
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-foreground truncate">
                    {scale.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {scale.durationMin} min · {scale.approach}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {sorted.length > 6 && (
          <Link
            to="/library/scales"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            + {sorted.length - 6} escalas
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
