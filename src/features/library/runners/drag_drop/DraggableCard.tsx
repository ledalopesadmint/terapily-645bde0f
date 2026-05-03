/**
 * DraggableCard — visual "post-it" card for drag-drop activities.
 *
 * Micro-rotation (±2deg), 3D shadow, terracotta-tinted, satisfying grab.
 * Uses @dnd-kit useDraggable.
 */

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { GripVertical } from "lucide-react";

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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative select-none rounded-xl border-2 border-transparent px-4 py-3 transition-shadow duration-200",
        "bg-[oklch(0.94_0.025_65)] text-[oklch(0.30_0.02_65)]",
        "shadow-[0_2px_8px_oklch(0.50_0.04_65/0.15)]",
        isDragging && [
          "z-50 rotate-0 scale-105 cursor-grabbing",
          "border-[oklch(0.661_0.045_153.6)]",
          "shadow-[0_12px_32px_oklch(0.50_0.04_65/0.3)]",
        ],
        !isDragging && "cursor-grab hover:shadow-[0_4px_16px_oklch(0.50_0.04_65/0.2)]",
        placed && "border-[oklch(0.661_0.045_153.6/0.3)]",
        compact && "px-3 py-2 text-sm",
      )}
      {...listeners}
      {...attributes}
      aria-label={`Card: ${label ?? text}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.60_0.03_65)] transition-opacity",
            isDragging ? "opacity-100" : "opacity-40 group-hover:opacity-70",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          {label && (
            <span className="mb-0.5 block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[oklch(0.55_0.04_65)]">
              {label}
            </span>
          )}
          <p className={cn("leading-snug", compact ? "text-sm" : "text-[0.9375rem]")}>
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
