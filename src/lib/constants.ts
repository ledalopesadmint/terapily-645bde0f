/**
 * Constantes globais Terapily.
 * Centralizadas pra que mudanças de copy/branding sejam um único PR.
 */

export const BRAND = {
  name: "Terapily",
  wordmark: "terapily",
  // Landing pública é EN-US (ver mem://preferences/language-strategy)
  tagline: "Therapeutic tools your clients actually finish.",
  description:
    "Dynamic, evidence-based therapeutic activities for CBT clinicians. Use them live in session or send them home with a single link — every activity generates clinical signal you can defend.",
  founder: "Leda Carolina Lopes",
  domain: "terapily.com",
} as const;

export const TRIAL_DURATION_DAYS = 14;

export const COPY = {
  // Microcopy padrão do brand book
  saved: "Salvo.",
  ready: "Pronto.",
  oneMoment: "Um momento.",
  welcomeBack: "Bem-vinda de volta.",
  letsStart: "Pronto. Vamos começar.",
  somethingWrong: "Algo não funcionou. Tente novamente.",
} as const;
