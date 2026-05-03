/**
 * CardSortLayout — Click-to-classify mode for card_sort.
 *
 * Two-step flow:
 *  1. Patient clicks a thought → it expands in a blur-overlay modal
 *  2. Patient selects a cognitive distortion category → thought is classified
 *
 * Layout: Left 1/3 = stacked thought cards. Right 2/3 = category grid.
 * Progress bar at the very bottom to avoid "is this a drag target?" confusion.
 *
 * On mobile/tablet: prompts landscape orientation for best experience.
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { HelpCircle, Check, ChevronRight, X, Sparkles } from "lucide-react";
import type { CardDef, ZoneDef } from "./drag-drop-types";
import { Progress } from "@/components/ui/progress";

/** Zone accent colors — distinct pastels for each zone */
const ZONE_COLORS = [
  { bg: "oklch(0.95 0.03 150)", border: "oklch(0.75 0.08 150)", header: "oklch(0.40 0.06 150)", dot: "oklch(0.60 0.10 150)" },
  { bg: "oklch(0.95 0.03 210)", border: "oklch(0.75 0.08 210)", header: "oklch(0.40 0.06 210)", dot: "oklch(0.60 0.10 210)" },
  { bg: "oklch(0.95 0.03 30)",  border: "oklch(0.75 0.08 30)",  header: "oklch(0.40 0.06 30)",  dot: "oklch(0.60 0.10 30)"  },
  { bg: "oklch(0.95 0.03 330)", border: "oklch(0.75 0.08 330)", header: "oklch(0.40 0.06 330)", dot: "oklch(0.60 0.10 330)" },
  { bg: "oklch(0.95 0.03 270)", border: "oklch(0.75 0.08 270)", header: "oklch(0.40 0.06 270)", dot: "oklch(0.60 0.10 270)" },
  { bg: "oklch(0.95 0.03 80)",  border: "oklch(0.75 0.08 80)",  header: "oklch(0.40 0.06 80)",  dot: "oklch(0.60 0.10 80)"  },
] as const;

/** 8 distinct pastel tones for thought cards */
const PASTEL_PALETTE = [
  { bg: "oklch(0.92 0.04 30)",   border: "oklch(0.82 0.06 30)",   text: "oklch(0.35 0.04 30)"   },
  { bg: "oklch(0.92 0.04 80)",   border: "oklch(0.82 0.06 80)",   text: "oklch(0.35 0.04 80)"   },
  { bg: "oklch(0.92 0.04 150)",  border: "oklch(0.82 0.06 150)",  text: "oklch(0.35 0.04 150)"  },
  { bg: "oklch(0.92 0.04 210)",  border: "oklch(0.82 0.06 210)",  text: "oklch(0.35 0.04 210)"  },
  { bg: "oklch(0.92 0.04 270)",  border: "oklch(0.82 0.06 270)",  text: "oklch(0.35 0.04 270)"  },
  { bg: "oklch(0.92 0.04 330)",  border: "oklch(0.82 0.06 330)",  text: "oklch(0.35 0.04 330)"  },
  { bg: "oklch(0.92 0.04 120)",  border: "oklch(0.82 0.06 120)",  text: "oklch(0.35 0.04 120)"  },
  { bg: "oklch(0.92 0.04 50)",   border: "oklch(0.82 0.06 50)",   text: "oklch(0.35 0.04 50)"   },
] as const;

function getCardColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return PASTEL_PALETTE[Math.abs(hash) % PASTEL_PALETTE.length];
}

function getZoneColor(index: number) {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

/* ─── Cognitive Distortion Explainer Modal ─── */
function DistortionExplainerModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[oklch(0.60_0.10_270)]" />
            <h3 className="text-lg font-bold text-[var(--navy)]">
              O que são distorções cognitivas?
            </h3>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            São <strong>padrões automáticos de pensamento</strong> que distorcem a realidade.
            Todo mundo tem — mas quando ficam muito frequentes, podem alimentar ansiedade e depressão.
          </p>

          {/* Visual example */}
          <div className="rounded-xl border-2 border-dashed border-[oklch(0.80_0.06_210)] bg-[oklch(0.97_0.01_210)] p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[oklch(0.50_0.06_210)]">
              Exemplo prático
            </p>

            {/* Situation */}
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[oklch(0.60_0.10_210)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--navy)]">Situação</p>
                <p className="text-sm text-foreground">"Meu chefe não respondeu meu e-mail."</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground/40" />
            </div>

            {/* Distorted thought */}
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[oklch(0.60_0.10_30)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--navy)]">Pensamento distorcido</p>
                <p className="text-sm text-foreground italic">"Ele me odeia. Vou ser demitido."</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground/40" />
            </div>

            {/* Distortion type */}
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[oklch(0.60_0.10_330)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--navy)]">Distorção identificada</p>
                <p className="text-sm font-medium" style={{ color: "oklch(0.40 0.06 330)" }}>
                  Conclusões Precipitadas
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tirar conclusões negativas sem evidências concretas.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-1">
            Neste exercício, você vai praticar identificar esses padrões nos pensamentos apresentados.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Thought Expansion Modal (blur backdrop) ─── */
function ThoughtModal({
  card,
  onClose,
  onSelectCategory,
}: {
  card: CardDef;
  onClose: () => void;
  onSelectCategory: () => void;
}) {
  const color = getCardColor(card.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl border-2 p-6 shadow-2xl animate-scale-in"
        style={{ backgroundColor: color.bg, borderColor: color.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-black/5 transition-colors"
          style={{ color: color.text }}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {card.label && (
          <span
            className="mb-2 block text-xs font-bold uppercase tracking-[0.12em]"
            style={{ color: color.text }}
          >
            {card.label}
          </span>
        )}

        <p
          className="text-lg font-medium leading-relaxed mb-6"
          style={{ color: "oklch(0.25 0.02 65)" }}
        >
          "{card.text}"
        </p>

        <button
          onClick={onSelectCategory}
          className="w-full rounded-xl bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          Classificar este pensamento →
        </button>
      </div>
    </div>
  );
}

/* ─── Main Layout ─── */

interface CardSortLayoutProps {
  cards: CardDef[];
  zones: ZoneDef[];
  placements: Record<string, string>;
  onPlaceCard?: (cardId: string, zoneId: string) => void;
}

export function CardSortLayout({ cards, zones, placements, onPlaceCard }: CardSortLayoutProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  const unplacedCards = useMemo(() => cards.filter((c) => !placements[c.id]), [cards, placements]);
  const selectedCard = selectedCardId ? cards.find((c) => c.id === selectedCardId) : null;

  const progress = Math.round((Object.keys(placements).length / cards.length) * 100);

  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setShowCategoryPicker(false);
  }, []);

  const handleClassify = useCallback(() => {
    setShowCategoryPicker(true);
  }, []);

  const handleSelectZone = useCallback((zoneId: string) => {
    if (selectedCardId && onPlaceCard) {
      onPlaceCard(selectedCardId, zoneId);
    }
    setSelectedCardId(null);
    setShowCategoryPicker(false);
  }, [selectedCardId, onPlaceCard]);

  const allPlaced = unplacedCards.length === 0;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        {/* Main two-panel layout */}
        <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">

          {/* LEFT PANEL — Thoughts (1/3) */}
          <div className="flex w-1/3 min-w-[200px] flex-col rounded-2xl border border-border/40 bg-white/60">
            <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Pensamentos
              </span>
              {!allPlaced && (
                <span className="rounded-full bg-[var(--navy)] px-2 py-0.5 text-[0.6rem] font-bold text-white">
                  {unplacedCards.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unplacedCards.map((card) => {
                const color = getCardColor(card.id);
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    className={cn(
                      "w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium leading-snug transition-all duration-200",
                      "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
                      selectedCardId === card.id && "ring-2 ring-[var(--navy)] ring-offset-1",
                    )}
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border,
                      color: "oklch(0.25 0.02 65)",
                    }}
                  >
                    {card.text}
                  </button>
                );
              })}

              {allPlaced && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Check className="h-8 w-8 text-[var(--sage)]" />
                  <p className="text-sm font-medium text-[var(--sage)]">
                    Todos classificados!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL — Categories (2/3) */}
          <div className="flex flex-[2] flex-col rounded-2xl border border-border/40 bg-white/40">
            {/* Header with explainer */}
            <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Categorias de{" "}
                <span className="normal-case">distorção cognitiva</span>
              </span>
              <button
                onClick={() => setShowExplainer(true)}
                className="rounded-full p-0.5 text-muted-foreground hover:text-[var(--navy)] hover:bg-muted transition-colors"
                aria-label="O que são distorções cognitivas?"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {showCategoryPicker && selectedCard ? (
                /* Category selection mode */
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Selecione a categoria que melhor descreve este pensamento:
                  </p>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {zones.map((zone, i) => {
                      const zc = getZoneColor(i);
                      const count = Object.values(placements).filter((z) => z === zone.id).length;
                      return (
                        <button
                          key={zone.id}
                          onClick={() => handleSelectZone(zone.id)}
                          className="flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
                          style={{
                            backgroundColor: zc.bg,
                            borderColor: zc.border,
                          }}
                        >
                          <span
                            className="mt-1 h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: zone.color ?? zc.dot }}
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className="text-sm font-bold"
                              style={{ color: zc.header }}
                            >
                              {zone.label}
                            </span>
                            {zone.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                {zone.description}
                              </p>
                            )}
                            {count > 0 && (
                              <span
                                className="mt-1 inline-flex h-4 items-center rounded-full px-1.5 text-[0.6rem] font-bold text-white"
                                style={{ backgroundColor: zc.dot }}
                              >
                                {count} classificado{count !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Default — show placed cards summary */
                <div className="space-y-3">
                  {zones.map((zone, i) => {
                    const zc = getZoneColor(i);
                    const placedCards = cards.filter(
                      (c) => placements[c.id] === zone.id,
                    );
                    return (
                      <div
                        key={zone.id}
                        className="rounded-xl border p-3"
                        style={{
                          backgroundColor: placedCards.length > 0
                            ? `color-mix(in oklch, ${zc.bg} 70%, transparent)`
                            : "transparent",
                          borderColor: placedCards.length > 0
                            ? zc.border
                            : "oklch(0.90 0.00 0)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: zone.color ?? zc.dot }}
                          />
                          <span
                            className="text-xs font-bold"
                            style={{ color: placedCards.length > 0 ? zc.header : "oklch(0.60 0.00 0)" }}
                          >
                            {zone.label}
                          </span>
                          {placedCards.length > 0 && (
                            <span
                              className="ml-auto flex h-4 w-4 items-center justify-center rounded-full text-[0.55rem] font-bold text-white"
                              style={{ backgroundColor: zc.dot }}
                            >
                              {placedCards.length}
                            </span>
                          )}
                        </div>
                        {placedCards.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {placedCards.map((card) => {
                              const cc = getCardColor(card.id);
                              return (
                                <div
                                  key={card.id}
                                  className="rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: cc.bg,
                                    borderColor: cc.border,
                                    color: "oklch(0.30 0.02 65)",
                                  }}
                                >
                                  {card.text}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {placedCards.length === 0 && (
                          <p className="text-xs text-muted-foreground/50 pl-4">
                            Nenhum pensamento ainda
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {!allPlaced && (
                    <p className="text-center text-xs text-muted-foreground/60 pt-2">
                      ← Selecione um pensamento para classificar
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM — Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {Object.keys(placements).length}/{cards.length} classificados
          </span>
        </div>
      </div>

      {/* Modals */}
      {selectedCard && !showCategoryPicker && (
        <ThoughtModal
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
          onSelectCategory={handleClassify}
        />
      )}

      {showExplainer && (
        <DistortionExplainerModal onClose={() => setShowExplainer(false)} />
      )}
    </>
  );
}
