/**
 * InSessionQuickAccess — seção destaque no Acervo.
 *
 * Mostra preview das primeiras escalas do seed com cards editoriais
 * (ilustração + título + descrição) + link "Ver todas" → /scales.
 */

import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight } from "lucide-react";
import type { Activity as ActivityType } from "./library.types";
import { ScaleCard, getScaleIllustration } from "./ScaleCard";

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

  const preview = sorted.slice(0, 3);

  return (
    <section aria-labelledby="in-session-title" className="mx-auto max-w-6xl px-4 sm:px-8">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-7">
        <Link
          to="/scales"
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
            Ver todas →
          </span>
        </Link>
        <p className="mb-5 text-sm text-muted-foreground max-w-xl">
          Selecione, escolha o paciente e comece. Score automático ao final.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((scale) => {
            const isExclusive =
              scale.supportedModes.length === 1 &&
              scale.supportedModes[0] === "in_session";
            return (
              <ScaleCard
                key={scale.id}
                code={scale.code}
                name={scale.name}
                category={scale.category}
                durationMin={scale.durationMin}
                shortDescription={scale.shortDescription}
                illustration={scale.illustration ?? getScaleIllustration(scale.category)}
                isExclusive={isExclusive}
                onClick={() => onStartInSession(scale)}
              />
            );
          })}
        </div>

        {sorted.length > 3 && (
          <Link
            to="/scales"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            + {sorted.length - 3} escalas
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
