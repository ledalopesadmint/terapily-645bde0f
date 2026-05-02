/**
 * Seed data do Acervo — dados estáticos de fallback (TEMPORÁRIO).
 *
 * ⚠️  NÃO é a fonte de verdade. A fonte oficial é a tabela `activity_catalog`
 *     no banco, consultada via `listAvailableActivities()`.
 *
 * Esses dados existem APENAS para:
 *   - Alimentar a UI do catálogo quando o banco ainda não tem atividades
 *     de todos os arquétipos (S3: só quiz_scale está implementado)
 *   - Dar density visual ao protótipo do acervo
 *
 * Será removido quando todos os arquétipos estiverem populados no banco.
 */

import type { Activity, Category, CategoryId } from "./library.types";

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

export const ACTIVITIES: Activity[] = [
  {
    id: "phq-9",
    code: "PHQ-9",
    name: "PHQ-9",
    approach: "Escala validada",
    category: "anxiety",
    archetype: "quiz_scale",
    theme: "navy",
    durationMin: 4,
    shortDescription: "Triagem de sintomas depressivos nas últimas duas semanas. Auto-pontuada.",
    illustration: "petals",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "pcl-5",
    code: "PCL-5",
    name: "PCL-5",
    approach: "Escala validada",
    category: "trauma",
    archetype: "quiz_scale",
    theme: "navy",
    durationMin: 8,
    shortDescription: "PTSD Checklist — 20 itens baseados no DSM-5. Só em sessão.",
    illustration: "anchor",
    supportedModes: ["in_session"],
  },
  {
    id: "gad-7",
    code: "GAD-7",
    name: "GAD-7",
    approach: "Escala validada",
    category: "anxiety",
    archetype: "quiz_scale",
    theme: "navy",
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
    theme: "sage",
    durationMin: 5,
    shortDescription: "Quatro ciclos guiados pra acalmar o sistema nervoso simpático.",
    illustration: "spiral",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "thought-record-7col",
    code: "CBT-01",
    name: "Thought Record · 7 colunas",
    approach: "TCC",
    category: "cbt",
    archetype: "structured_form",
    theme: "cream",
    durationMin: 15,
    shortDescription: "Registro completo de pensamentos (Beck). Situação, pensamento automático, emoções, evidências, pensamento alternativo e reavaliação.",
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
    theme: "cream",
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
    theme: "mauve",
    durationMin: 10,
    shortDescription: "Pesar evidências de um pensamento difícil. Termina com um pensamento alternativo.",
    illustration: "compass",
    supportedModes: ["in_session", "shared_link", "both"],
  },
  {
    id: "grounding-54321",
    code: "TRA-02",
    name: "Ancoragem 5-4-3-2-1",
    approach: "Grounding",
    category: "mindfulness",
    archetype: "guided_script",
    theme: "terracotta",
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
    theme: "sage-dark",
    durationMin: 4,
    shortDescription: "Quatro tempos iguais — inspira, segura, expira, segura. Ritmo militar adaptado pra clínica.",
    illustration: "horizon",
    supportedModes: ["in_session", "shared_link", "both"],
  },
];

export function getActivitiesByCategory(category: CategoryId): Activity[] {
  return ACTIVITIES.filter((a) => a.category === category);
}
