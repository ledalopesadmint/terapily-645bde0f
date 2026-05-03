/**
 * DragDropRunner — Orchestrator for the drag_drop archetype.
 *
 * Reads config (card_sort | ranking_ladder | cycle_builder) and renders
 * the appropriate layout. Manages DnD state, tracks time, emits onSubmit
 * with structured response data.
 *
 * UX: Instruction header, progress indicator, Submit button.
 * Visual: Terracotta-tinted cards, Sage drop zones, micro-rotations.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Check, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CardSortLayout } from "./CardSortLayout";
import { RankingLadderLayout } from "./RankingLadderLayout";
import { CycleBuilderLayout } from "./CycleBuilderLayout";
import type {
  DragDropConfig,
  DragDropResponseData,
  CardSortPlacement,
  RankingLadderPlacement,
  CycleBuilderPlacement,
} from "./drag-drop-types";

interface DragDropRunnerProps {
  config: DragDropConfig;
  onSubmit?: (data: DragDropResponseData) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function DragDropRunner({
  config,
  onSubmit,
  submitting,
  submitLabel = "Finalizar",
}: DragDropRunnerProps) {
  const startTime = useRef(Date.now());
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── card_sort state ──
  const [sortPlacements, setSortPlacements] = useState<Record<string, string>>({});

  // ── ranking_ladder state ──
  const [ladderOrder, setLadderOrder] = useState<string[]>(() =>
    config.mode === "ranking_ladder" ? config.cards.map((c) => c.id) : [],
  );

  // ── cycle_builder state ── (slotId → cardId)
  const [cyclePlacements, setCyclePlacements] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // ── Progress ──
  const progress = useMemo(() => {
    if (config.mode === "card_sort") {
      const placed = Object.keys(sortPlacements).length;
      return Math.round((placed / config.cards.length) * 100);
    }
    if (config.mode === "ranking_ladder") {
      // Always 100% since all cards are in the list from start
      return 100;
    }
    if (config.mode === "cycle_builder") {
      const placed = Object.keys(cyclePlacements).length;
      return Math.round((placed / config.slots.length) * 100);
    }
    return 0;
  }, [config, sortPlacements, cyclePlacements]);

  const isComplete = useMemo(() => {
    if (config.mode === "card_sort") {
      return Object.keys(sortPlacements).length === config.cards.length;
    }
    if (config.mode === "ranking_ladder") return true; // always complete
    if (config.mode === "cycle_builder") {
      return Object.keys(cyclePlacements).length === config.slots.length;
    }
    return false;
  }, [config, sortPlacements, cyclePlacements]);

  // ── DnD handlers ──
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      if (config.mode === "card_sort") {
        // Check if dropped on a zone
        const zone = config.zones.find((z) => z.id === overIdStr);
        if (zone) {
          setSortPlacements((prev) => ({ ...prev, [activeIdStr]: zone.id }));
        }
      } else if (config.mode === "ranking_ladder") {
        // Reorder in the sortable list
        setLadderOrder((prev) => {
          const oldIndex = prev.indexOf(activeIdStr);
          const newIndex = prev.indexOf(overIdStr);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      } else if (config.mode === "cycle_builder") {
        // Check if dropped on a slot
        const slotId = overIdStr.startsWith("slot-") ? overIdStr.slice(5) : null;
        if (slotId && config.slots.find((s) => s.id === slotId)) {
          setCyclePlacements((prev) => {
            // Remove card from any other slot
            const cleaned = Object.fromEntries(
              Object.entries(prev).filter(([, cId]) => cId !== activeIdStr),
            );
            return { ...cleaned, [slotId]: activeIdStr };
          });
        }
      }
    },
    [config],
  );

  // ── Reset ──
  const handleReset = useCallback(() => {
    setSortPlacements({});
    setLadderOrder(config.cards.map((c) => c.id));
    setCyclePlacements({});
    startTime.current = Date.now();
  }, [config.cards]);

  // ── Submit ──
  const handleSubmit = useCallback(() => {
    if (!onSubmit) return;
    const duration = Math.round((Date.now() - startTime.current) / 1000);

    let placements: DragDropResponseData["placements"];

    if (config.mode === "card_sort") {
      const byZone: Record<string, string[]> = {};
      for (const [cardId, zoneId] of Object.entries(sortPlacements)) {
        if (!byZone[zoneId]) byZone[zoneId] = [];
        byZone[zoneId].push(cardId);
      }
      const result: CardSortPlacement[] = [];
      for (const [zoneId, cardIds] of Object.entries(byZone)) {
        cardIds.forEach((cardId, order) => {
          result.push({ cardId, zoneId, order });
        });
      }
      placements = result;
    } else if (config.mode === "ranking_ladder") {
      placements = ladderOrder.map(
        (cardId, i): RankingLadderPlacement => ({ cardId, rank: i + 1 }),
      );
    } else {
      placements = Object.entries(cyclePlacements).map(
        ([slotId, cardId]): CycleBuilderPlacement => ({ cardId, slotId }),
      );
    }

    onSubmit({ mode: config.mode, placements, duration_seconds: duration });
  }, [config, onSubmit, sortPlacements, ladderOrder, cyclePlacements]);

  // ── Active card for overlay ──
  const activeCard = activeId
    ? config.cards.find((c) => c.id === activeId)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6" style={{ maxHeight: "100%", minHeight: 0 }}>
      {/* Header */}
      <div className="space-y-3">
        <p className="text-base leading-relaxed text-foreground">
          {config.instruction}
        </p>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {progress}%
          </span>
        </div>
      </div>

      {/* Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {config.mode === "card_sort" && (
          <CardSortLayout
            cards={config.cards}
            zones={config.zones}
            placements={sortPlacements}
          />
        )}

        {config.mode === "ranking_ladder" && (
          <RankingLadderLayout
            cards={config.cards}
            order={ladderOrder}
            topLabel={config.topLabel}
            bottomLabel={config.bottomLabel}
          />
        )}

        {config.mode === "cycle_builder" && (
          <CycleBuilderLayout
            cards={config.cards}
            slots={config.slots}
            placements={cyclePlacements}
          />
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {activeCard && (
            <div className="rounded-xl border-2 border-sage bg-[oklch(0.94_0.025_65)] px-4 py-3 shadow-[0_12px_32px_oklch(0.50_0.04_65/0.3)]">
              <p className="text-[0.9375rem] leading-snug text-[oklch(0.30_0.02_65)]">
                {activeCard.text}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Recomeçar
        </button>

        <button
          type="button"
          disabled={!isComplete || submitting}
          onClick={handleSubmit}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200",
            isComplete
              ? "bg-sage text-sage-foreground shadow-md hover:shadow-lg"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          <Check className="h-4 w-4" aria-hidden />
          {submitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
