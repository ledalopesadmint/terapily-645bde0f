/**
 * CycleBuilderLayout — Sub-modo cycle_builder do DragDropRunner.
 *
 * Cards arrastáveis para slots nomeados de um ciclo (ex: Beck cycle).
 * Layout: slots em coluna com setas visuais entre eles.
 */

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DraggableCard } from "./DraggableCard";
import { ArrowDown } from "lucide-react";
import type { CardDef, SlotDef } from "./drag-drop-types";

interface CycleBuilderLayoutProps {
  cards: CardDef[];
  slots: SlotDef[];
  /** Map of slotId → cardId */
  placements: Record<string, string>;
}

function DroppableSlot({
  slot,
  card,
  isLast,
}: {
  slot: SlotDef;
  card: CardDef | null;
  isLast: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot-${slot.id}` });

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-3 transition-all duration-200",
          isOver
            ? "border-sage bg-[oklch(0.661_0.045_153.6/0.08)] shadow-inner"
            : card
              ? "border-[oklch(0.661_0.045_153.6/0.3)] bg-card/50"
              : "border-border/40 bg-card/20",
        )}
      >
        {/* Slot label */}
        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-sage">
          {slot.label}
        </span>

        {card ? (
          <DraggableCard id={card.id} text={card.text} label={card.label} placed compact />
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground/50">
            {slot.placeholder ?? "Arraste um card aqui"}
          </p>
        )}
      </div>

      {/* Arrow between slots (not after last) */}
      {!isLast && (
        <div className="flex justify-center py-1">
          <ArrowDown className="h-5 w-5 text-sage/40" aria-hidden />
        </div>
      )}
    </>
  );
}

export function CycleBuilderLayout({
  cards,
  slots,
  placements,
}: CycleBuilderLayoutProps) {
  const sortedSlots = [...slots].sort((a, b) => a.position - b.position);
  const placedCardIds = new Set(Object.values(placements));
  const unplacedCards = cards.filter((c) => !placedCardIds.has(c.id));

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* Unplaced cards pool */}
      {unplacedCards.length > 0 && (
        <div className="shrink-0 space-y-2 lg:w-56">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Cards disponíveis
          </p>
          <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
            {unplacedCards.map((card) => (
              <DraggableCard key={card.id} id={card.id} text={card.text} label={card.label} />
            ))}
          </div>
        </div>
      )}

      {/* Cycle slots */}
      <div className="mx-auto flex w-full max-w-md flex-col">
        {sortedSlots.map((slot, i) => {
          const cardId = placements[slot.id];
          const card = cardId ? cards.find((c) => c.id === cardId) ?? null : null;
          return (
            <DroppableSlot
              key={slot.id}
              slot={slot}
              card={card}
              isLast={i === sortedSlots.length - 1}
            />
          );
        })}

        {/* Visual loop arrow back to top */}
        {sortedSlots.length > 2 && (
          <div className="mt-2 flex justify-center">
            <div className="flex items-center gap-1.5 text-xs text-sage/50">
              <span className="text-lg">↻</span>
              <span className="font-medium">O ciclo se repete</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
