/**
 * Spacing — escala Tailwind v4 (4px base) usada no projeto.
 * Padrões de página em layout.ts.
 */
export const spacing = {
  0: "0", 0.5: "0.125rem", 1: "0.25rem", 1.5: "0.375rem",
  2: "0.5rem", 2.5: "0.625rem", 3: "0.75rem", 3.5: "0.875rem",
  4: "1rem", 5: "1.25rem", 6: "1.5rem", 7: "1.75rem", 8: "2rem",
  10: "2.5rem", 12: "3rem", 14: "3.5rem", 16: "4rem", 20: "5rem",
  24: "6rem", 28: "7rem", 32: "8rem", 40: "10rem", 48: "12rem",
} as const;

export const sectionPadding = {
  mobile:  "py-12 px-6",
  tablet:  "py-16 px-10",
  desktop: "py-24 px-16",
} as const;

export const containerMax = {
  prose:   "max-w-2xl",  // ~672px
  content: "max-w-4xl",  // ~896px
  page:    "max-w-6xl",  // ~1152px
  wide:    "max-w-7xl",  // ~1280px
} as const;
