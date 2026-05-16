/**
 * Terapily — Typography Tokens
 * Brand Book v3: Cormorant (display, serif) + Inter (UI, sans).
 * Wordmark "terapily" SEMPRE minúsculo. Capitalizado só em prosa.
 */

export const fontFamilies = {
  display: '"Cormorant", "Cormorant Garamond", Georgia, serif',
  sans:    '"Inter", system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const fontWeights = {
  light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800,
} as const;

export const lineHeights = {
  display: 1.05, // manchetes Cormorant
  body:    1.5,  // corpo Inter
  tight:   1.2,
  loose:   1.7,
} as const;

export const letterSpacing = {
  displayTight: "-0.015em",
  displayHero:  "-0.01em",
  bodyDefault:  "0",
  eyebrow:      "0.12em",   // +120 do brand book
  caption:      "0.18em",
  micro:        "0.22em",
} as const;

/** Escala fluida (clamp) usada em hero / landing. */
export const fluidScale = {
  hero:    "clamp(2.75rem, 4.4vw, 4.25rem)",
  display: "clamp(2rem, 3.2vw, 3.25rem)",
  h1:      "clamp(1.75rem, 2.4vw, 2.5rem)",
  h2:      "clamp(1.5rem, 1.8vw, 1.875rem)",
  body:    "1rem",
  small:   "0.875rem",
  micro:   "0.6875rem",
} as const;

/** Eyebrow utility — ALL CAPS tracked +120. */
export const eyebrowStyle = {
  fontFamily: fontFamilies.sans,
  fontWeight: fontWeights.extrabold,
  fontSize:   "0.6875rem",
  letterSpacing: letterSpacing.eyebrow,
  textTransform: "uppercase" as const,
} as const;
