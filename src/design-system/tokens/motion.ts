/**
 * Motion tokens — sempre conservador (terapia clínica, não tech-startup).
 * Durations curtas, easings calmos. Sem bounce.
 */
export const durations = {
  instant: "100ms",
  fast:    "150ms",
  base:    "200ms",
  med:     "300ms",
  slow:    "500ms",
  reveal:  "700ms",   // reveal-on-scroll na landing
} as const;

export const easings = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",     // material standard
  enter:    "cubic-bezier(0, 0, 0.2, 1)",       // decelerate
  exit:     "cubic-bezier(0.4, 0, 1, 1)",       // accelerate
  editorial:"cubic-bezier(0.22, 1, 0.36, 1)",   // suave, premium
} as const;

export const keyframes = {
  fadeIn:       { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
  fadeOut:      { from: { opacity: 1, transform: "translateY(0)" },    to: { opacity: 0, transform: "translateY(10px)" } },
  scaleIn:      { from: { transform: "scale(0.95)", opacity: 0 },      to: { transform: "scale(1)", opacity: 1 } },
  slideInRight: { from: { transform: "translateX(100%)" },             to: { transform: "translateX(0)" } },
} as const;

/** Princípio: respeitar prefers-reduced-motion. Sempre. */
export const reducedMotionRule = `
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;
