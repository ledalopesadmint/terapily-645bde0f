/**
 * Layout tokens — breakpoints, z-index, grids.
 * Espelha Tailwind v4 default + convenções do projeto.
 */
export const breakpoints = {
  sm:  "640px",
  md:  "768px",   // ponto de virada da sidebar (mobile → desktop)
  lg:  "1024px",
  xl:  "1280px",
  "2xl": "1536px",
} as const;

export const zIndex = {
  base:     0,
  dropdown: 10,
  sticky:   20,
  fixed:    30,
  modalBg:  40,
  modal:    50,
  popover:  60,
  toast:    70,
  tooltip:  80,
} as const;

/** Sidebar autenticada: 256px fixed, sticky, full-height. */
export const appShell = {
  sidebarWidth:        "16rem",     // w-64
  sidebarBg:           "var(--sidebar)",
  sidebarBreakpoint:   "md",        // visível >= md, header mobile abaixo
  headerHeightMobile:  "3.5rem",    // h-14
} as const;

/** Grade típica da landing (split 5fr/6fr no auth, 12 col na landing). */
export const grids = {
  authSplit: "lg:grid-cols-[5fr_6fr]",
  landing12: "grid-cols-1 md:grid-cols-12 gap-8",
} as const;
