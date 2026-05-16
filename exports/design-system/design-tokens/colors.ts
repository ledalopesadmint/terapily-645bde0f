/**
 * Terapily — Color Tokens (Brand Book v3 · 2026)
 * Camada de referência VISUAL agnóstica de runtime.
 * Não importa nada de Supabase, auth, hooks ou features.
 *
 * Regras inegociáveis (ver docs/design-system/LEGACY_VISUAL_AUDIT.md):
 *   1. Preto puro #000 PROIBIDO — usar Navy.
 *   2. Mauve só decorativo (≤8% da página, nunca em corpo).
 *   3. Sage e Mauve nunca lado a lado — separados por Cream/Navy.
 *   4. Proporção 60/30/10 — Cream / Navy / Sage|Mauve.
 *   5. Texto sobre Sage = Navy (6.2:1 AA Large). Nunca Cream sobre Sage.
 */

export const palette = {
  sage:     { hex: "#7E9B86", oklch: "oklch(0.661 0.045 153.6)" },
  navy:     { hex: "#1F2A36", oklch: "oklch(0.280 0.027 251.0)" },
  cream:    { hex: "#F4EFE6", oklch: "oklch(0.954 0.013 82.4)" },
  mauve:    { hex: "#B89BA3", oklch: "oklch(0.718 0.036 359.6)" },
  charcoal: { hex: "#3A3F47", oklch: "oklch(0.366 0.015 259.8)" },
} as const;

export const editorial = {
  terracotta: "oklch(0.665 0.082 65)",
  creamTan:   "oklch(0.918 0.022 82)",
  rust:       "oklch(0.52 0.105 35)",
  creamLight: "oklch(0.980 0.010 87.5)",
  creamDeep:  "oklch(0.927 0.020 84.6)",
  borderWarm: "oklch(0.887 0.020 84.6)",
} as const;

/** Cores exclusivas de ações críticas. NÃO usar em mais nenhum lugar. */
export const actionColors = {
  flag:            { bg: "oklch(0.58 0.18 22)",  fg: "oklch(0.98 0.005 90)",  subtle: "oklch(0.92 0.04 22)" },
  patientReport:   { bg: "oklch(0.56 0.10 175)", fg: "oklch(0.98 0.005 175)" },
  therapistReport: { bg: "oklch(0.55 0.12 350)", fg: "oklch(0.98 0.01 350)" },
} as const;

/** Status semáforo (Ativos / Arquivados / Excluídos) */
export const statusColors = {
  active:   { bg: "oklch(0.55 0.17 155)", fg: "oklch(0.98 0.005 155)", subtle: "oklch(0.92 0.06 155)", muted: "oklch(0.48 0.12 155)" },
  archived: { bg: "oklch(0.72 0.17 75)",  fg: "oklch(0.98 0.01 90)",   subtle: "oklch(0.93 0.05 75)",  muted: "oklch(0.52 0.12 75)" },
  deleted:  { bg: "oklch(0.53 0.21 27)",  fg: "oklch(0.98 0.005 27)",  subtle: "oklch(0.92 0.05 27)",  muted: "oklch(0.50 0.18 27)" },
} as const;

/** Semantic mapping (shadcn-compatible). */
export const semantic = {
  background:        palette.cream.oklch,
  foreground:        palette.charcoal.oklch,
  card:              editorial.creamLight,
  cardForeground:    palette.charcoal.oklch,
  primary:           palette.navy.oklch,
  primaryForeground: palette.cream.oklch,
  secondary:         palette.sage.oklch,
  secondaryForeground: palette.navy.oklch,
  muted:             editorial.creamDeep,
  mutedForeground:   "oklch(0.5 0.015 259.8)",
  accent:            palette.sage.oklch,
  accentForeground:  palette.navy.oklch,
  destructive:       "oklch(0.5 0.18 28)",
  border:            editorial.borderWarm,
  ring:              palette.sage.oklch,
} as const;

/** Sidebar editorial Navy escura. */
export const sidebarColors = {
  bg:             "oklch(0.235 0.025 251.0)",
  fg:             "oklch(0.92 0.013 82.4)",
  accent:         "oklch(0.30 0.028 251.0)",
  accentFg:       palette.cream.oklch,
  border:         "oklch(0.32 0.025 251.0)",
  activeInk:      palette.sage.oklch,
} as const;

/** Activity card themes (6 temas brand-coerentes). */
export const activityThemes = {
  sage:       { accent: palette.sage.oklch,  bg: "oklch(0.93 0.025 153.6)" },
  mauve:      { accent: palette.mauve.oklch, bg: "oklch(0.94 0.018 359.6)" },
  navy:       { accent: palette.navy.oklch,  bg: "oklch(0.91 0.018 251.0)" },
  cream:      { accent: editorial.terracotta, bg: editorial.creamTan },
  terracotta: { accent: editorial.terracotta, bg: "oklch(0.93 0.035 65)" },
  sageDark:   { accent: "oklch(0.45 0.04 153.6)", bg: "oklch(0.88 0.03 230)" },
} as const;
