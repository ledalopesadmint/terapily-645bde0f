/**
 * CategoryRow — carrossel horizontal de uma categoria.
 *
 * Estética Netflix-like, mas em voz Terapily:
 * - Header editorial (label Cormorant + subtitle Inter)
 * - Scroll horizontal com snap nativo CSS (zero JS)
 * - Setas que aparecem só no hover desktop (md+)
 * - Mobile: swipe nativo do navegador, sem botões
 *
 * Performance:
 * - Sem virtualização nesta versão (8-12 cards por linha aguenta nativo);
 *   virtualização real entra em S5 quando categoria tiver 30+ atividades
 * - Scroll-snap em CSS evita re-renders
 * - overflow-x-auto + scrollbar-hide custom abaixo
 */

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import type { Activity, Category } from "./catalog";

interface CategoryRowProps {
  category: Category;
  activities: Activity[];
  onStart?: (activity: Activity, mode: "in_session" | "shared_link") => void;
}

export function CategoryRow({ category, activities, onStart }: CategoryRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="group/row" aria-labelledby={`cat-${category.id}-title`}>
      {/* Header editorial */}
      <header className="mb-4 flex items-end justify-between gap-4 px-4 sm:px-8">
        <div>
          <h2
            id={`cat-${category.id}-title`}
            className="font-display text-2xl text-foreground sm:text-3xl"
          >
            {category.label}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{category.subtitle}</p>
        </div>

        {/* Setas — só desktop, só visíveis no hover */}
        <div className="hidden gap-1 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100 md:flex">
          <button
            type="button"
            onClick={() => scrollBy("left")}
            aria-label={`Rolar ${category.label} para a esquerda`}
            className="
              flex h-9 w-9 items-center justify-center rounded-full
              border border-border bg-card text-foreground
              transition-all hover:border-secondary/50 hover:bg-secondary/10
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollBy("right")}
            aria-label={`Rolar ${category.label} para a direita`}
            className="
              flex h-9 w-9 items-center justify-center rounded-full
              border border-border bg-card text-foreground
              transition-all hover:border-secondary/50 hover:bg-secondary/10
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      {/* Carrossel */}
      <div
        ref={scrollerRef}
        className="
          library-scroller
          flex gap-4 overflow-x-auto scroll-smooth pb-6 pt-2
          [scroll-snap-type:x_mandatory]
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          px-4 sm:px-8
        "
      >
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="[scroll-snap-align:start] [scroll-snap-stop:always]"
          >
            <ActivityCard activity={activity} onStart={onStart} />
          </div>
        ))}
        {/* Spacer pra last card poder snapar com folga */}
        <div aria-hidden className="w-1 shrink-0" />
      </div>
    </section>
  );
}
