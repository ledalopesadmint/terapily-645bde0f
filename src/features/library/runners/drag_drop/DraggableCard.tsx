/**
 * DraggableCard — visual "post-it" card for drag-drop activities.
 *
 * Each card gets a unique pastel color from a palette of 8 tones.
 * Micro-rotation, 3D shadow, satisfying grab with clear affordance.
 * Uses @dnd-kit useDraggable.
 */

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { GripVertical } from "lucide-react";

/** 8 distinct pastel tones for visual variety */
const PASTEL_PALETTE = [
  { bg: "oklch(0.92 0.04 30)",   border: "oklch(0.82 0.06 30)",   grip: "oklch(0.65 0.06 30)"   }, // peach
  { bg: "oklch(0.92 0.04 80)",   border: "oklch(0.82 0.06 80)",   grip: "oklch(0.65 0.06 80)"   }, // honey
  { bg: "oklch(0.92 0.04 150)",  border: "oklch(0.82 0.06 150)",  grip: "oklch(0.65 0.06 150)"  }, // mint
  { bg: "oklch(0.92 0.04 210)",  border: "oklch(0.82 0.06 210)",  grip: "oklch(0.65 0.06 210)"  }, // sky
  { bg: "oklch(0.92 0.04 270)",  border: "oklch(0.82 0.06 270)",  grip: "oklch(0.65 0.06 270)"  }, // lavender
  { bg: "oklch(0.92 0.04 330)",  border: "oklch(0.82 0.06 330)",  grip: "oklch(0.65 0.06 330)"  }, // rose
  { bg: "oklch(0.92 0.04 120)",  border: "oklch(0.82 0.06 120)",  grip: "oklch(0.65 0.06 120)"  }, // lime
  { bg: "oklch(0.92 0.04 50)",   border: "oklch(0.82 0.06 50)",   grip: "oklch(0.65 0.06 50)"   }, // amber
] as const;

function getCardColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return PASTEL_PALETTE[Math.abs(hash) % PASTEL_PALETTE.length];
}

interface DraggableCardProps {
  id: string;
  text: string;
  label?: string;
  /** Whether this card is already placed in a zone/slot */
  placed?: boolean;
  /** Compact mode for when placed inside zones */
  compact?: boolean;
}

export function DraggableCard({ id, text, label, placed, compact }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });

  const color = useMemo(() => getCardColor(id), [id]);

  // Stable micro-rotation per card (seeded from id hash)
  const rotation = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    }
    return ((hash % 5) - 2) * 0.8; // ±1.6deg range
  }, [id]);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    rotate: isDragging ? "0deg" : `${rotation}deg`,
    backgroundColor: color.bg,
    borderColor: isDragging ? "oklch(0.661 0.045 153.6)" : color.border,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative select-none rounded-xl border-2 px-4 py-3 transition-all duration-200",
        "text-[oklch(0.25_0.02_65)]",
        isDragging && [
          "z-50 rotate-0 scale-105 cursor-grabbing",
          "shadow-[0_12px_32px_oklch(0.40_0.04_65/0.3)]",
        ],
        !isDragging && [
          "cursor-grab",
          "shadow-[0_2px_8px_oklch(0.50_0.04_65/0.12)]",
          "hover:shadow-[0_6px_20px_oklch(0.50_0.04_65/0.2)]",
          "hover:scale-[1.02]",
        ],
        compact && "px-3 py-2 text-sm",
      )}
      {...listeners}
      {...attributes}
      aria-label={`Card: ${label ?? text}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 transition-opacity",
            isDragging ? "opacity-100" : "opacity-50 group-hover:opacity-80",
          )}
          style={{ color: color.grip }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          {label && (
            <span
              className="mb-0.5 block text-[0.65rem] font-bold uppercase tracking-[0.12em]"
              style={{ color: color.grip }}
            >
              {label}
            </span>
          )}
          <p className={cn("leading-snug font-medium", compact ? "text-sm" : "text-[0.9375rem]")}>
            {text}
          </p>
        </div>
      </div>

      {/* Drag hint on unplaced cards */}
      {!placed && !isDragging && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[0.6rem] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: color.grip }}
          aria-hidden
        >
          arraste ↓
        </span>
      )}
    </div>
  );
}
