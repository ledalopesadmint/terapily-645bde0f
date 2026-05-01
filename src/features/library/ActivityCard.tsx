/**
 * ActivityCard — card premium do acervo Terapily.
 *
 * Estética (brand book v3):
 * - Fundo cream-light (var(--card))
 * - Faixa fina sage no topo
 * - Ilustração SVG inline (lazy-friendly, ~1-2KB cada)
 * - Chip mauve com aproach + duração (mauve só decorativo, dentro do limite ≤8%)
 * - Título Cormorant em Navy
 * - Hover: scale 1.04 + sage glow + revela 2 botões CTA
 *
 * Performance:
 * - Tudo em CSS transform/box-shadow → GPU-accelerated, zero recálculo de layout
 * - Respeita prefers-reduced-motion (transition desligada na regra global do tw-animate)
 * - Sem JS pra hover — apenas group-hover utilities
 *
 * Acessibilidade:
 * - Card é <article> com aria-labelledby
 * - Botões CTA são tabbable independentes do card
 * - Sensitive activities mostram badge discreto pra avisar terapeuta
 */

import { Play } from "lucide-react";
import { ActivityIllustration } from "./illustrations";
import type { Activity } from "./library.types";

interface ActivityCardProps {
  activity: Activity;
  onStart?: (activity: Activity, mode: "in_session" | "shared_link") => void;
}

export function ActivityCard({ activity, onStart }: ActivityCardProps) {
  const titleId = `activity-${activity.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      data-theme={activity.theme}
      className="
        group relative isolate flex h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-xl
        border border-border/60 bg-card
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:scale-[1.04]
        hover:[border-color:color-mix(in_oklab,var(--activity-accent)_55%,transparent)]
        hover:[box-shadow:0_18px_40px_-18px_var(--activity-glow)]
        focus-within:-translate-y-1 focus-within:scale-[1.04]
        focus-within:[border-color:color-mix(in_oklab,var(--activity-accent)_55%,transparent)]
      "
    >
      {/* Faixa hairline no topo — cor do tema */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] [background-color:var(--activity-accent)] opacity-80"
      />

      {/* Ilustração — área visual dominante. Fundo pastel do tema. */}
      <div
        className="relative aspect-[10/7] w-full overflow-hidden [background-color:var(--activity-illustration-bg)]"
      >
        <ActivityIllustration
          id={activity.illustration}
          className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
        {activity.sensitive && (
          <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-mauve-foreground backdrop-blur-sm">
            Sensível
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-4">
        {/* Chip aproach · duração */}
        <div className="flex items-center gap-2 text-[0.6875rem] font-medium tracking-wide">
          <span className="text-secondary-foreground/90">{activity.approach}</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-mauve" />
          <span className="text-muted-foreground">{activity.durationMin} min</span>
        </div>

        {/* Título Cormorant */}
        <h3
          id={titleId}
          className="font-display text-xl leading-tight text-foreground"
        >
          {activity.name}
        </h3>

        {/* Descrição — sempre visível */}
        <p className="line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground/90">
          {activity.shortDescription}
        </p>

        {/* CTAs — revelados no hover, mas tabbable sempre */}
        <div className="
          mt-auto flex gap-2 pt-3
          opacity-0 translate-y-1 transition-all duration-300
          group-hover:opacity-100 group-hover:translate-y-0
          group-focus-within:opacity-100 group-focus-within:translate-y-0
        ">
          <button
            type="button"
            onClick={() => onStart?.(activity, "in_session")}
            className="
              inline-flex flex-1 items-center justify-center gap-1.5 rounded-md
              bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground
              transition-colors hover:bg-primary/90
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <Play className="h-3 w-3" aria-hidden />
            Em sessão
          </button>
        </div>
      </div>
    </article>
  );
}
