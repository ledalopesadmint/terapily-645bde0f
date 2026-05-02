/**
 * Config schema para o arquétipo `structured_form`.
 *
 * Template de referência: Thought Record (Beck 7-column).
 * Usa-se para worksheets, diários, planos de segurança —
 * qualquer atividade com passos sequenciais e campos variados.
 *
 * Convenções:
 *  - Cada step = uma "página" no player (navegação prev/next).
 *  - Cada field dentro do step = um input.
 *  - `id` dos fields devem ser únicos GLOBALMENTE dentro do config
 *    (serão chaves no `responses` JSONB).
 *  - `clinical_flag` em um field dispara flag se preenchido
 *    com conteúdo acima do threshold (para fields numéricos)
 *    ou se preenchido (para fields de texto — presença = flag).
 */

export interface FormFieldOption {
  value: string;
  label: string;
}

export type FormFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multi_select"
  | "slider"
  | "number"
  | "time"
  | "date"
  | "checkbox"
  | "radio"
  | "emotion_picker"; // custom: emoção + intensidade (Thought Record)

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  // select / multi_select / radio
  options?: FormFieldOption[];
  // slider / number
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  // textarea
  rows?: number;
  // emotion_picker
  emotions?: string[]; // preset emotion list
  // clinical flagging
  clinical_flag?: string;
  flag_threshold?: number;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  icon?: string; // lucide icon name (optional)
  fields: FormField[];
}

export interface StructuredFormConfig {
  introduction?: string;
  steps: FormStep[];
  supported_modes?: string[];
  restricted_reason?: string;
  /** Whether to show a summary step before submit */
  showSummary?: boolean;
}
