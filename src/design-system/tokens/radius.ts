/**
 * Border radius — escala Tailwind v4 com offset configurável.
 * --radius base = 0.5rem (8px). Componentes shadcn herdam dele.
 */
export const radiusBase = "0.5rem";

export const radius = {
  none: "0",
  sm:   "calc(var(--radius) - 4px)",  // 4px
  md:   "calc(var(--radius) - 2px)",  // 6px
  lg:   "var(--radius)",              // 8px
  xl:   "calc(var(--radius) + 4px)",  // 12px
  "2xl":"calc(var(--radius) + 8px)",  // 16px
  "3xl":"calc(var(--radius) + 12px)", // 20px
  full: "9999px",
} as const;
