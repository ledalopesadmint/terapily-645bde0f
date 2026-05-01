/**
 * ScaleCard — card editorial para escalas validadas.
 *
 * Mesmo estilo visual do ActivityCard: ilustração SVG no topo,
 * chip de metadados, título Cormorant, descrição truncada, CTA hover.
 * Reutilizado no Acervo (InSessionQuickAccess) e em /scales.
 */

import { Play } from "lucide-react";
import { ActivityIllustration } from "./illustrations";
import type { Activity } from "./library.types";

/** Mapeia category da escala → ilustração do acervo */
const CATEGORY_ILLUSTRATION: Record<string, Activity["illustration"]> = {
  depression: "petals",
  anxiety: "tide",
  trauma: "anchor",
  substance_use: "scattered",
  ocd: "lattice",
  eating: "compass",
  sleep: "horizon",
  wellbeing: "spiral",
  cbt: "lattice",
  act: "spiral",
};

export function getScaleIllustration(category: string): Activity["illustration"] {
  return CATEGORY_ILLUSTRATION[category] ?? "petals";
}

interface ScaleCardProps {
  code: string;
  name: string;
  category: string;
  durationMin: number;
  shortDescription?: string;
  illustration: Activity["illustration"];
  isExclusive?: boolean;
  onClick?: () => void;
}

export function ScaleCard({
  code,
  name,
  category,
  durationMin,
  shortDescription,
  illustration,
  isExclusive,
  onClick,
}: ScaleCardProps) {
  const titleId = `scale-${code}-title`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-labelledby={titleId}
      className="
        group relative isolate flex h-full flex-col overflow-hidden rounded-xl
        border border-border/60 bg-card text-left
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:scale-[1.02]
        hover:border-[var(--sage)]/50
        hover:shadow-[0_14px_32px_-14px_var(--activity-glow)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {/* Faixa hairline no topo */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-[3px] bg-[var(--sage)] opacity-60"
      />

      {/* Ilustração SVG — área visual dominante */}
      <div className="relative aspect-[10/7] w-full overflow-hidden bg-[var(--cream)]">
        <ActivityIllustration
          id={illustration}
          className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
        {isExclusive && (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-card/90 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-[var(--navy)] backdrop-blur-sm">
            Só em sessão
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
        {/* Chip code · duração */}
        <div className="flex items-center gap-2 text-[0.6875rem] font-medium tracking-wide">
          <span className="text-secondary-foreground/90">Escala validada</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-mauve" />
          <span className="text-muted-foreground">{durationMin} min</span>
        </div>

        {/* Título */}
        <h3
          id={titleId}
          className="font-display text-lg leading-tight text-foreground"
        >
          {name}
        </h3>

        {/* Descrição */}
        {shortDescription && (
          <p className="line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground/90">
            {shortDescription}
          </p>
        )}

        {/* CTA hover */}
        <div className="
          mt-auto flex gap-2 pt-2
          opacity-0 translate-y-1 transition-all duration-300
          group-hover:opacity-100 group-hover:translate-y-0
          group-focus-within:opacity-100 group-focus-within:translate-y-0
        ">
          <span className="
            inline-flex flex-1 items-center justify-center gap-1.5 rounded-md
            bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground
          ">
            <Play className="h-3 w-3" aria-hidden />
            Aplicar em sessão
          </span>
        </div>
      </div>
    </button>
  );
}
