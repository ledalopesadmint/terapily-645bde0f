/**
 * RankingLadderLayout — Sub-modo ranking_ladder do DragDropRunner.
 *
 * Reordenar cards verticalmente por intensidade.
 * Top = high intensity, bottom = low intensity.
 */

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import type { CardDef } from "./drag-drop-types";
import { useMemo } from "react";

interface RankingLadderLayoutProps {
  cards: CardDef[];
  /** Ordered array of card IDs (top = rank 1) */
  order: string[];
  topLabel: string;
  bottomLabel: string;
}

function SortableCard({ card, rank }: { card: CardDef; rank: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const rotation = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < card.id.length; i++) {
      hash = ((hash << 5) - hash + card.id.charCodeAt(i)) | 0;
    }
    return ((hash % 5) - 2) * 0.6;
  }, [card.id]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    rotate: isDragging ? "0deg" : `${rotation}deg`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-4 py-3 transition-shadow duration-200",
        "bg-[oklch(0.94_0.025_65)] text-[oklch(0.30_0.02_65)]",
        "shadow-[0_2px_8px_oklch(0.50_0.04_65/0.15)]",
        isDragging && [
          "z-50 scale-105 cursor-grabbing",
          "shadow-[0_12px_32px_oklch(0.50_0.04_65/0.3)]",
        ],
        !isDragging && "cursor-grab hover:shadow-[0_4px_16px_oklch(0.50_0.04_65/0.2)]",
      )}
      {...listeners}
      {...attributes}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[oklch(0.661_0.045_153.6/0.15)] text-xs font-bold text-sage">
        {rank}
      </span>
      <GripVertical
        className="h-4 w-4 shrink-0 text-[oklch(0.60_0.03_65)] opacity-40 group-hover:opacity-70"
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-[0.9375rem] leading-snug">{card.text}</p>
    </div>
  );
}

export function RankingLadderLayout({
  cards,
  order,
  topLabel,
  bottomLabel,
}: RankingLadderLayoutProps) {
  const orderedCards = order.map((id) => cards.find((c) => c.id === id)!).filter(Boolean);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-1">
      {/* Top label */}
      <div className="flex items-center gap-2 pb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sage/30 to-transparent" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-sage">
          {topLabel}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sage/30 to-transparent" />
      </div>

      {/* Sortable list */}
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5">
          {orderedCards.map((card, i) => (
            <SortableCard key={card.id} card={card} rank={i + 1} />
          ))}
        </div>
      </SortableContext>

      {/* Bottom label */}
      <div className="flex items-center gap-2 pt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {bottomLabel}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
      </div>
    </div>
  );
}
