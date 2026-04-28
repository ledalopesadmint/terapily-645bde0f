/**
 * Catálogo MOCKADO do acervo (S1 — visualização do protótipo).
 *
 * IMPORTANTE: este arquivo é TEMPORÁRIO. Em S3 (semana de Activity catalog +
 * delivery_mode) ele é substituído por:
 *   - tabela `activity_catalog` no banco (RLS por workspace pra customização futura)
 *   - server function `getActivityCatalog()` que retorna estes mesmos campos
 *   - hook `useActivityCatalog()` consumindo via TanStack Query
 *
 * O shape `Activity` aqui é INTENCIONALMENTE o mesmo que a tabela vai ter.
 * Quando migrar, só troca a fonte — nenhum componente precisa mudar.
 *
 * 8 atividades curadas de categorias diferentes pra mostrar densidade visual
 * sem inflar o seed (lista completa de 50+33 atividades vive em
 * `mem://features/clinical-scales-catalog` e no PDF de homeworks).
 */

import type { ArchetypeId } from "./archetypes";

export type DeliveryMode = "in_session" | "shared_link" | "both";

/**
 * Tema visual da atividade. 6 paletas brand-coerentes definidas em styles.css.
 * Mesmos valores do enum `activity_theme` no banco (S3+).
 *   - sage      → calmo, respiração, mindfulness
 *   - mauve     → autocompaixão, vínculo
 *   - navy      → avaliações clínicas (escalas validadas)
 *   - cream     → psicoeducação, leitura
 *   - terracotta → somático, corpo
 *   - sage-dark → sono, noite, regulação
 */
export type ActivityTheme =
  | "sage"
  | "mauve"
  | "navy"
  | "cream"
  | "terracotta"
  | "sage-dark";

export type CategoryId =
  | "anxiety"
  | "depression"
  | "cbt"
  | "mindfulness"
  | "trauma"
  | "dbt"
  | "act"
  | "sleep"
  | "crisis";

export interface Category {
  id: CategoryId;
  label: string;        // EN (alinhado à landing internacional, embora app seja PT-BR)
  subtitle: string;     // descrição editorial curta
}

export interface Activity {
  id: string;
  code: string;                          // ex: "PHQ-9", "CBT-01"
  name: string;
  approach: string;                      // ex: "CBT", "DBT", "ACT", "Mindfulness"
  category: CategoryId;
  archetype: ArchetypeId;
  /** Tema visual (6 paletas brand). Default 'sage' se omitido. */
  theme: ActivityTheme;
  durationMin: number;
  shortDescription: string;              // 1 frase pra hover/card expandido
  /**
   * Identificador da ilustração SVG inline.
   * Em S3+ pode virar URL de WebP rico, mas a interface fica igual.
   */
  illustration:
    | "petals"
    | "tide"
    | "lattice"
    | "horizon"
    | "spiral"
    | "scattered"
    | "anchor"
    | "compass";
  /** Quais modos de entrega esse exercício suporta. */
  supportedModes: DeliveryMode[];
  /** Marca exercícios sensíveis (Trauma, Crisis) — gating Practice em S5. */
  sensitive?: boolean;
}

export const CATEGORIES: Category[] = [
  {
    id: "anxiety",
    label: "Anxiety toolkit",
    subtitle: "Para quando o corpo fala mais alto que a razão.",
  },
  {
    id: "cbt",
    label: "CBT essentials",
    subtitle: "Reestruturação cognitiva — o coração do método.",
  },
  {
    id: "mindfulness",
    label: "Mindfulness & grounding",
    subtitle: "Ancoragem no presente, em minutos.",
  },
];

/**
 * Seed de 8 atividades pra alimentar o protótipo visual.
 * Distribuídas pelas 3 categorias acima.
 */
export const ACTIVITIES: Activity[] = [
  // —— Anxiety toolkit
  {
    id: "phq-9",
    code: "PHQ-9",
    name: "PHQ-9",
    approach: "Escala validada",
    category: "anxiety",
    archetype: "quiz_scale",
    durationMin: 4,
    shortDescription: "Triagem de sintomas depressivos nas últimas duas semanas. Auto-pontuada.",
    illustration: "petals",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "gad-7",
    code: "GAD-7",
    name: "GAD-7",
    approach: "Escala validada",
    category: "anxiety",
    archetype: "quiz_scale",
    durationMin: 3,
    shortDescription: "Ansiedade generalizada em sete itens. Padrão-ouro de triagem.",
    illustration: "tide",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "478-breathing",
    code: "MIN-01",
    name: "Respiração 4-7-8",
    approach: "Mindfulness",
    category: "anxiety",
    archetype: "guided_timer",
    durationMin: 5,
    shortDescription: "Quatro ciclos guiados pra acalmar o sistema nervoso simpático.",
    illustration: "spiral",
    supportedModes: ["in_session", "shared_link", "both"],
  },

  // —— CBT essentials
  {
    id: "thought-record-3col",
    code: "CBT-01",
    name: "Registro de pensamentos · 3 colunas",
    approach: "TCC",
    category: "cbt",
    archetype: "structured_form",
    durationMin: 8,
    shortDescription: "Situação · pensamento automático · emoção. O passo zero da reestruturação.",
    illustration: "lattice",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "cognitive-distortions-tagging",
    code: "CBT-03",
    name: "Distorções cognitivas",
    approach: "TCC",
    category: "cbt",
    archetype: "drag_drop",
    durationMin: 7,
    shortDescription: "Identifique padrões de pensamento por categoria — catastrofização, leitura mental e mais.",
    illustration: "scattered",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "evidence-for-against",
    code: "CBT-08",
    name: "Evidências a favor e contra",
    approach: "TCC",
    category: "cbt",
    archetype: "structured_form",
    durationMin: 10,
    shortDescription: "Pesar evidências de um pensamento difícil. Termina com um pensamento alternativo.",
    illustration: "compass",
    supportedModes: ["in_session", "shared_link", "both"],
  },

  // —— Mindfulness & grounding
  {
    id: "grounding-54321",
    code: "TRA-02",
    name: "Ancoragem 5-4-3-2-1",
    approach: "Grounding",
    category: "mindfulness",
    archetype: "guided_script",
    durationMin: 4,
    shortDescription: "Cinco coisas que vê, quatro que sente, três que ouve. Volta ao presente em minutos.",
    illustration: "anchor",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "box-breathing",
    code: "MIN-02",
    name: "Respiração quadrada",
    approach: "Mindfulness",
    category: "mindfulness",
    archetype: "guided_timer",
    durationMin: 4,
    shortDescription: "Quatro tempos iguais — inspira, segura, expira, segura. Ritmo militar adaptado pra clínica.",
    illustration: "horizon",
    supportedModes: ["in_session", "shared_link", "both"],
  },
];

export function getActivitiesByCategory(category: CategoryId): Activity[] {
  return ACTIVITIES.filter((a) => a.category === category);
}
