/**
 * CardSortLayout — Sub-modo card_sort do DragDropRunner.
 *
 * Two-panel layout:
 *  - TOP: "Pensamentos" pool with colored cards on a tray
 *  - BOTTOM: Drop zones as distinct colored columns with clear targets
 *
 * Visual: Each zone gets a unique accent color. Clear "arraste aqui"
 * placeholders with pulsing border on hover. Counter badges.
 */

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DraggableCard } from "./DraggableCard";
import type { CardDef, ZoneDef } from "./drag-drop-types";
import { Inbox, ArrowDown } from "lucide-react";

/** Zone accent colors — distinct pastels for each zone */
const ZONE_COLORS = [
  { bg: "oklch(0.95 0.03 150)", border: "oklch(0.75 0.08 150)", header: "oklch(0.40 0.06 150)", dot: "oklch(0.60 0.10 150)" }, // sage-mint
  { bg: "oklch(0.95 0.03 210)", border: "oklch(0.75 0.08 210)", header: "oklch(0.40 0.06 210)", dot: "oklch(0.60 0.10 210)" }, // sky-blue
  { bg: "oklch(0.95 0.03 30)",  border: "oklch(0.75 0.08 30)",  header: "oklch(0.40 0.06 30)",  dot: "oklch(0.60 0.10 30)"  }, // peach
  { bg: "oklch(0.95 0.03 330)", border: "oklch(0.75 0.08 330)", header: "oklch(0.40 0.06 330)", dot: "oklch(0.60 0.10 330)" }, // rose
  { bg: "oklch(0.95 0.03 270)", border: "oklch(0.75 0.08 270)", header: "oklch(0.40 0.06 270)", dot: "oklch(0.60 0.10 270)" }, // lavender
  { bg: "oklch(0.95 0.03 80)",  border: "oklch(0.75 0.08 80)",  header: "oklch(0.40 0.06 80)",  dot: "oklch(0.60 0.10 80)"  }, // honey
] as const;

function getZoneColor(index: number) {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

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
  colorIndex,
}: {
  zone: ZoneDef;
  cards: CardDef[];
  placedCardIds: string[];
  colorIndex: number;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: zone.id });
  const placedCards = cards.filter((c) => placedCardIds.includes(c.id));
  const zoneColor = getZoneColor(colorIndex);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[140px] flex-col rounded-2xl border-2 transition-all duration-300",
        isOver && "scale-[1.02] shadow-lg",
      )}
      style={{
        backgroundColor: isOver ? zoneColor.bg : `color-mix(in oklch, ${zoneColor.bg} 60%, transparent)`,
        borderColor: isOver ? zoneColor.border : `color-mix(in oklch, ${zoneColor.border} 50%, transparent)`,
        borderStyle: placedCards.length > 0 ? "solid" : "dashed",
      }}
    >
      {/* Zone header */}
      <div
        className="flex items-center gap-2 rounded-t-xl px-4 py-2.5"
        style={{ backgroundColor: zoneColor.bg }}
      >
        <span
          className="h-3.5 w-3.5 rounded-full shadow-sm"
          style={{ backgroundColor: zone.color ?? zoneColor.dot }}
          aria-hidden
        />
        <span
          className="text-sm font-bold tracking-wide"
          style={{ color: zoneColor.header }}
        >
          {zone.label}
        </span>
        {placedCards.length > 0 && (
          <span
            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold text-white"
            style={{ backgroundColor: zoneColor.dot }}
          >
            {placedCards.length}
          </span>
        )}
      </div>

      {zone.description && (
        <p className="px-4 pt-2 text-xs text-muted-foreground">{zone.description}</p>
      )}

      {/* Placed cards */}
      <div className="flex flex-col gap-2 p-3">
        {placedCards.map((card) => (
          <DraggableCard key={card.id} id={card.id} text={card.text} label={card.label} placed compact />
        ))}

        {/* Empty state */}
        {placedCards.length === 0 && (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-6 transition-all duration-200",
              isOver ? "border-current opacity-80" : "opacity-40",
            )}
            style={{ borderColor: zoneColor.border, color: zoneColor.header }}
          >
            <Inbox className="h-5 w-5" aria-hidden />
            <span className="text-xs font-medium">Solte aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CardSortLayout({ cards, zones, placements }: CardSortLayoutProps) {
  const unplacedCards = cards.filter((c) => !placements[c.id]);

  return (
    <div className="flex flex-col gap-8">
      {/* Unplaced cards pool — the "tray" */}
      {unplacedCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Pensamentos
            </span>
            <span className="rounded-full bg-[var(--navy)] px-2 py-0.5 text-[0.6rem] font-bold text-white">
              {unplacedCards.length} restante{unplacedCards.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="rounded-2xl border border-border/50 bg-white/50 p-4">
            <div className="flex flex-wrap gap-3">
              {unplacedCards.map((card) => (
                <DraggableCard key={card.id} id={card.id} text={card.text} label={card.label} />
              ))}
            </div>
          </div>

          {/* Visual arrow hint */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
            <ArrowDown className="h-4 w-4 animate-bounce" />
            <span className="text-xs font-medium">Arraste cada card para a categoria correta</span>
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      )}

      {/* All placed — congratulation */}
      {unplacedCards.length === 0 && (
        <div className="rounded-2xl border border-[var(--sage)]/30 bg-[var(--sage)]/5 px-4 py-3 text-center">
          <p className="text-sm font-medium text-[var(--sage)]">
            ✓ Todos os pensamentos classificados! Revise ou finalize.
          </p>
        </div>
      )}

      {/* Drop zones */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Categorias
        </p>
        <div
          className={cn(
            "grid gap-4",
            zones.length <= 2 && "grid-cols-1 sm:grid-cols-2",
            zones.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            zones.length >= 4 && zones.length <= 6 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            zones.length > 6 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {zones.map((zone, i) => (
            <DroppableZone
              key={zone.id}
              zone={zone}
              cards={cards}
              colorIndex={i}
              placedCardIds={
                Object.entries(placements)
                  .filter(([, zId]) => zId === zone.id)
                  .map(([cId]) => cId)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
