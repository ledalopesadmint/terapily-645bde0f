/**
 * CardSortLayout — Sub-modo card_sort do DragDropRunner.
 *
 * Cards arrastáveis em colunas/categorias (drop zones).
 * Exemplo: CBT-03 Distorções Cognitivas.
 */

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DraggableCard } from "./DraggableCard";
import type { CardDef, ZoneDef } from "./drag-drop-types";

interface CardSortLayoutProps {
  cards: CardDef[];
  zones: ZoneDef[];
  /** Map of cardId → zoneId */
  placements: Record<string, string>;
}

function DroppableZone({
  zone,
  cards,
  placedCardIds,
}: {
  zone: ZoneDef;
  cards: CardDef[];
  placedCardIds: string[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: zone.id });

  const placedCards = cards.filter((c) => placedCardIds.includes(c.id));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[120px] flex-col gap-2 rounded-xl border-2 border-dashed p-3 transition-all duration-200",
        isOver
          ? "border-sage bg-[oklch(0.661_0.045_153.6/0.08)] shadow-inner"
          : "border-border/40 bg-card/30",
      )}
    >
      {/* Zone header */}
      <div className="mb-1 flex items-center gap-2">
        {zone.color && (
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: zone.color }}
            aria-hidden
          />
        )}
        <span className="text-sm font-semibold text-foreground">
          {zone.label}
        </span>
        {placedCards.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {placedCards.length}
          </span>
        )}
      </div>

      {zone.description && (
        <p className="mb-1 text-xs text-muted-foreground">{zone.description}</p>
      )}

      {/* Placed cards */}
      {placedCards.map((card) => (
        <DraggableCard key={card.id} id={card.id} text={card.text} label={card.label} placed compact />
      ))}

      {/* Empty state */}
      {placedCards.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground/60">
          Arraste um card aqui
        </p>
      )}
    </div>
  );
}

export function CardSortLayout({ cards, zones, placements }: CardSortLayoutProps) {
  const unplacedCards = cards.filter((c) => !placements[c.id]);

  return (
    <div className="flex flex-col gap-6">
      {/* Unplaced cards pool */}
      {unplacedCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Cards disponíveis
          </p>
          <div className="flex flex-wrap gap-3">
            {unplacedCards.map((card) => (
              <DraggableCard key={card.id} id={card.id} text={card.text} label={card.label} />
            ))}
          </div>
        </div>
      )}

      {/* Drop zones */}
      <div
        className={cn(
          "grid gap-4",
          zones.length <= 2 && "grid-cols-1 sm:grid-cols-2",
          zones.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          zones.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {zones.map((zone) => (
          <DroppableZone
            key={zone.id}
            zone={zone}
            cards={cards}
            placedCardIds={
              Object.entries(placements)
                .filter(([, zId]) => zId === zone.id)
                .map(([cId]) => cId)
            }
          />
        ))}
      </div>
    </div>
  );
}
