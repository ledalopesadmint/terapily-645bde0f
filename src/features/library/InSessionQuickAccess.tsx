/**
 * InSessionQuickAccess — seção destaque no topo do Acervo.
 * 
 * Mostra todas as escalas validadas (archetype quiz_scale) que suportam
 * in_session, com botão direto "Em sessão" que abre o PatientPickerSheet.
 * 
 * Prioriza escalas in_session-only (Grupo 1: PHQ-9, PCL-5, C-SSRS) no topo,
 * seguidas das demais escalas que também suportam in_session.
 */

import { Activity, Play } from "lucide-react";
import type { Activity as ActivityType } from "./library.types";

interface InSessionQuickAccessProps {
  /** All activities from the catalog */
  activities: ActivityType[];
  /** Callback when "Em sessão" is clicked on a scale */
  onStartInSession: (activity: ActivityType) => void;
}

export function InSessionQuickAccess({
  activities,
  onStartInSession,
}: InSessionQuickAccessProps) {
  // Filter scales that support in_session
  const inSessionScales = activities.filter(
    (a) =>
      a.archetype === "quiz_scale" &&
      a.supportedModes.includes("in_session"),
  );

  if (inSessionScales.length === 0) return null;

  // Sort: in_session-only first, then alphabetical
  const sorted = [...inSessionScales].sort((a, b) => {
    const aOnly = a.supportedModes.length === 1 && a.supportedModes[0] === "in_session";
    const bOnly = b.supportedModes.length === 1 && b.supportedModes[0] === "in_session";
    if (aOnly && !bOnly) return -1;
    if (!aOnly && bOnly) return 1;
    return a.code.localeCompare(b.code);
  });

  return (
    <section aria-labelledby="in-session-title" className="mx-auto max-w-6xl px-4 sm:px-8">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-7">
        <header className="mb-5">
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
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Selecione, escolha o paciente e comece. Score automático ao final.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((scale) => {
            const isExclusive =
              scale.supportedModes.length === 1 &&
              scale.supportedModes[0] === "in_session";
            return (
              <button
                key={scale.id}
                onClick={() => onStartInSession(scale)}
                className="
                  group flex items-center gap-3.5 rounded-xl border border-border/50
                  bg-background p-3.5 text-left
                  transition-all duration-200
                  hover:border-[var(--sage)]/60 hover:shadow-sm hover:-translate-y-px
                "
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--navy)]/8 text-[var(--navy)] transition-colors group-hover:bg-[var(--sage)]/15 group-hover:text-[var(--sage)]">
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
      </div>
    </section>
  );
}
