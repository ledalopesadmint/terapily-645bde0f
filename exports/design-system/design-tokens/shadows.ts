/**
 * Shadows — sempre warm-tinted (nunca preto puro).
 * Tinta base derivada do Navy oklch p/ harmonizar com o Cream de fundo.
 */
const navyTint = (a: number) => `0 0 0 0 color-mix(in oklab, oklch(0.280 0.027 251.0) ${a}%, transparent)`;

export const shadows = {
  none: "none",
  xs:   "0 1px 2px 0 rgb(31 42 54 / 0.04)",
  sm:   "0 1px 3px 0 rgb(31 42 54 / 0.06), 0 1px 2px -1px rgb(31 42 54 / 0.04)",
  md:   "0 4px 6px -1px rgb(31 42 54 / 0.08), 0 2px 4px -2px rgb(31 42 54 / 0.06)",
  lg:   "0 10px 15px -3px rgb(31 42 54 / 0.10), 0 4px 6px -4px rgb(31 42 54 / 0.06)",
  xl:   "0 20px 25px -5px rgb(31 42 54 / 0.12), 0 8px 10px -6px rgb(31 42 54 / 0.06)",
  /** Elevação editorial (cards do acervo no hover). */
  glow: "0 18px 40px -16px var(--activity-glow, rgb(31 42 54 / 0.18))",
  /** Sidebar logo drop-shadow (ícone Cream sobre Navy). */
  iconCream: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
} as const;

export const gradients = {
  /** Radial sutil usado no painel navy de auth (top-right). */
  sageGlow: "radial-gradient(circle, var(--sage) 0%, transparent 70%)",
  /** Faixa hairline no topo dos activity cards. */
  hairline: "linear-gradient(90deg, transparent 0%, var(--activity-accent) 50%, transparent 100%)",
  /** Hero diagonal cream → cream-tan. */
  creamDiagonal: "linear-gradient(135deg, var(--cream) 0%, var(--cream-tan) 100%)",
} as const;
