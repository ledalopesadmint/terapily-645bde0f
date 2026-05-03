/**
 * Config schema para o arquétipo `drag_drop`.
 *
 * 3 sub-modos:
 *  - card_sort:       Arrastar cards em colunas/categorias
 *  - ranking_ladder:  Reordenar cards verticalmente por intensidade
 *  - cycle_builder:   Posicionar cards em slots de um ciclo visual
 *
 * Convenções:
 *  - `id` dos cards e zones devem ser únicos globalmente.
 *  - Resultado salvo em activity_responses.response_data.
 *  - Compatível com Worksheet Result PDF template.
 */

export type DragDropMode = "card_sort" | "ranking_ladder" | "cycle_builder";

export interface CardDef {
  id: string;
  text: string;
  /** Optional short label shown on collapsed card */
  label?: string;
}

export interface ZoneDef {
  id: string;
  label: string;
  /** Hex or oklch color for the zone header/border */
  color?: string;
  /** Optional description shown below label */
  description?: string;
}

export interface SlotDef {
  id: string;
  label: string;
  /** Position hint for cycle layout: 0-based index around the cycle */
  position: number;
  /** Optional prompt text shown in empty slot */
  placeholder?: string;
}

// ── Mode-specific configs ──

export interface CardSortConfig {
  mode: "card_sort";
  instruction: string;
  cards: CardDef[];
  zones: ZoneDef[];
}

export interface RankingLadderConfig {
  mode: "ranking_ladder";
  instruction: string;
  cards: CardDef[];
  /** Label for the top of the ladder (high intensity) */
  topLabel: string;
  /** Label for the bottom (low intensity) */
  bottomLabel: string;
}

export interface CycleBuilderConfig {
  mode: "cycle_builder";
  instruction: string;
  cards: CardDef[];
  slots: SlotDef[];
}

export type DragDropConfig =
  | CardSortConfig
  | RankingLadderConfig
  | CycleBuilderConfig;

// ── Response data shapes ──

export interface CardSortPlacement {
  cardId: string;
  zoneId: string;
  order: number;
}

export interface RankingLadderPlacement {
  cardId: string;
  rank: number;
}

export interface CycleBuilderPlacement {
  cardId: string;
  slotId: string;
}

export interface DragDropResponseData {
  mode: DragDropMode;
  placements: CardSortPlacement[] | RankingLadderPlacement[] | CycleBuilderPlacement[];
  duration_seconds: number;
}
