/**
 * CategoryBrowser — grid de cards quadrados por categoria.
 *
 * Cada card mostra: ilustração geométrica, nome editorial, subtítulo curto e
 * chip "Em breve" (não inventamos contagem — só temos 8 mocks na S1).
 *
 * Em S2.5/S3, quando o activity_catalog tiver dados reais, o chip vira
 * "X ferramentas" lendo de uma server function `getCategoryCounts()`.
 */

import { Brain, HeartPulse, Wind, Moon, Sparkles, Anchor, Compass, ScrollText, LifeBuoy } from "lucide-react";
import type { CategoryId } from "./library.types";

interface CategoryMeta {
  id: CategoryId;
  label: string;
  subtitle: string;
  icon: typeof Brain;
  /** Cor temática (pastel pro fundo). */
  tone: "sage" | "mauve" | "navy" | "terracotta" | "cream" | "sage-dark";
}

/**
 * Catálogo COMPLETO de categorias clínicas planejadas (S3+).
 * Cada uma vira uma seção/rota futura. Hoje 3 têm mocks (anxiety, cbt,
 * mindfulness) — as outras aparecem com chip "Em breve".
 */
const ALL_CATEGORIES: CategoryMeta[] = [
  { id: "anxiety", label: "Ansiedade", subtitle: "Quando o corpo fala mais alto que a razão.", icon: Wind, tone: "sage" },
  { id: "depression", label: "Depressão", subtitle: "Triagem e psicoeducação clínica.", icon: HeartPulse, tone: "navy" },
  { id: "cbt", label: "TCC", subtitle: "Reestruturação cognitiva — o coração do método.", icon: Brain, tone: "mauve" },
  { id: "mindfulness", label: "Mindfulness", subtitle: "Ancoragem no presente, em minutos.", icon: Sparkles, tone: "sage-dark" },
  { id: "trauma", label: "Trauma", subtitle: "Estabilização e grounding clínico.", icon: Anchor, tone: "terracotta" },
  { id: "dbt", label: "DBT", subtitle: "Regulação emocional e tolerância ao mal-estar.", icon: Compass, tone: "mauve" },
  { id: "act", label: "ACT", subtitle: "Aceitação e ação comprometida com valores.", icon: ScrollText, tone: "cream" },
  { id: "sleep", label: "Sono", subtitle: "Higiene do sono e regulação do ritmo.", icon: Moon, tone: "sage-dark" },
  { id: "crisis", label: "Crise", subtitle: "Protocolos breves para momentos críticos.", icon: LifeBuoy, tone: "navy" },
];

interface CategoryBrowserProps {
  /** IDs de categorias que JÁ têm mocks/atividades carregados (chip oculto pra elas). */
  liveCategoryIds: CategoryId[];
}

export function CategoryBrowser({ liveCategoryIds }: CategoryBrowserProps) {
  const liveSet = new Set(liveCategoryIds);

  return (
    <section aria-labelledby="browse-title">
      <header className="mb-5 px-4 sm:px-8">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
          Navegue
        </p>
        <h2
          id="browse-title"
          className="mt-2 font-display text-2xl text-foreground sm:text-3xl"
        >
          Por categoria clínica
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Nove eixos clínicos. Comece pelo que a sessão pede.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:px-8 lg:grid-cols-4 xl:grid-cols-5">
        {ALL_CATEGORIES.map((cat) => {
          const isLive = liveSet.has(cat.id);
          const Icon = cat.icon;
          return (
            <article
              key={cat.id}
              data-theme={cat.tone}
              aria-label={cat.label}
              className="
                group relative flex aspect-square flex-col justify-between overflow-hidden rounded-xl
                border border-border/60 bg-card p-4
                transition-all duration-300
                hover:-translate-y-0.5 hover:border-[color:var(--activity-accent)]
                hover:[box-shadow:0_14px_32px_-18px_var(--activity-glow)]
              "
            >
              {/* Fundo pastel temático no topo */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1/2 [background-color:var(--activity-illustration-bg)] opacity-60"
              />

              <div className="relative">
                <div
                  className="
                    flex h-10 w-10 items-center justify-center rounded-lg
                    bg-cream/95 text-navy
                    [box-shadow:0_2px_6px_-2px_color-mix(in_oklab,var(--navy)_25%,transparent)]
                  "
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
              </div>

              <div className="relative mt-auto">
                <h3 className="font-display text-lg leading-tight text-foreground">
                  {cat.label}
                </h3>
                <p className="mt-1 line-clamp-2 text-[0.75rem] leading-snug text-muted-foreground">
                  {cat.subtitle}
                </p>
                <div className="mt-2.5">
                  {isLive ? (
                    <span className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-secondary-foreground/70">
                      Disponível
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-cream px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                      Em breve
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
