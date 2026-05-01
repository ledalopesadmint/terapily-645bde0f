/**
 * LibraryHero — bloco "Featured tools" no topo do acervo.
 *
 * Card grande Navy gradient (referência editorial premium) com:
 * - Eyebrow Sage
 * - Manchete Cormorant Cream
 * - Descrição editorial curta
 * - Chip de contexto (categoria · duração)
 *
 * Em S3 isto vira uma seleção dinâmica baseada em uso recente / curadoria
 * editorial. Hoje é estático apontando pra primeira escala validada do seed.
 */

import { ArrowRight } from "lucide-react";
import type { Activity } from "./library.types";

interface LibraryHeroProps {
  activity: Activity;
  onStart?: (activity: Activity, mode: "in_session" | "shared_link") => void;
}

export function LibraryHero({ activity, onStart }: LibraryHeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="
        relative isolate overflow-hidden rounded-2xl
        bg-navy text-cream
        [background-image:radial-gradient(circle_at_85%_15%,color-mix(in_oklab,var(--sage)_35%,transparent)_0%,transparent_45%),linear-gradient(135deg,var(--navy)_0%,oklch(0.22_0.025_251)_100%)]
      "
    >
      {/* Padrão decorativo abstrato — círculos concêntricos sutis */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 opacity-[0.07]"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="0.6" />
      </svg>

      <div className="relative grid gap-8 p-8 sm:p-10 md:grid-cols-[1.4fr_1fr] md:gap-12">
        <div className="flex flex-col">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-sage">
            Em destaque · esta semana
          </p>
          <h2
            id="hero-title"
            className="mt-3 font-display text-3xl leading-[1.1] text-cream sm:text-4xl md:text-[2.75rem]"
          >
            {activity.name}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/75 sm:text-base">
            {activity.shortDescription}
          </p>

          <dl className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <dt className="text-cream/45">Abordagem</dt>
              <dd className="font-medium text-cream/90">{activity.approach}</dd>
            </div>
            <span aria-hidden className="h-1 w-1 rounded-full bg-cream/25" />
            <div className="flex items-center gap-2">
              <dt className="text-cream/45">Duração</dt>
              <dd className="font-medium text-cream/90">{activity.durationMin} min</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onStart?.(activity, "in_session")}
              className="
                group inline-flex items-center gap-2 rounded-md
                bg-cream px-5 py-2.5 text-sm font-medium text-navy
                transition-all hover:bg-sage hover:text-navy
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-navy
              "
            >
              Aplicar em sessão
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Painel lateral — placeholder editorial com glyph (sem fingir métricas) */}
        <div className="hidden md:flex md:items-center md:justify-center">
          <div
            aria-hidden
            className="
              relative flex h-44 w-44 items-center justify-center rounded-2xl
              border border-cream/15 bg-cream/[0.04]
              backdrop-blur-sm
            "
          >
            <span className="font-display text-6xl text-cream/85">
              {activity.code.split("-")[0]}
            </span>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-sage px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-navy">
              {activity.archetype.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
