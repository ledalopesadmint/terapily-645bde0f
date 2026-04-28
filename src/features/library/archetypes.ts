/**
 * Os 5 ARQUÉTIPOS de tool do Terapily.
 *
 * Decisão arquitetural (S1, validada pra implementação real em S3):
 * Em vez de programar 80 atividades artesanalmente, temos 5 componentes
 * reutilizáveis que recebem schema JSON. Cada arquétipo cobre uma família
 * inteira de exercícios clínicos.
 *
 *   1. quiz_scale       → 33 escalas validadas + ABC Model + qualquer questionário
 *   2. drag_drop        → Cognitive Distortions Tagging, Values Card Sort, etc
 *   3. structured_form  → Thought Record 7-col, Sleep Diary, Safety Plan, etc
 *   4. guided_timer     → 4-7-8 Breathing, Box Breathing, Body Scan, etc
 *   5. guided_script    → Leaves on a Stream, Self-Compassion Break, etc
 *
 * Cada arquétipo:
 * - Será um chunk JS separado (lazy import) — bundle inicial fica leve
 * - Sabe gerar seu próprio relatório clínico (activity_reports JSONB)
 * - É testado uma única vez, atende 10-30 atividades
 *
 * Implementação real dos componentes <ScaleRunner/>, <FormRunner/> etc:
 * S3 (Activity catalog + delivery_mode). Aqui só os contratos.
 */

export type ArchetypeId =
  | "quiz_scale"
  | "drag_drop"
  | "structured_form"
  | "guided_timer"
  | "guided_script";

export interface ArchetypeMeta {
  id: ArchetypeId;
  label: string;            // PT-BR (app interno)
  shortLabel: string;       // pra chip de card
  description: string;
  estimatedActivities: number; // quantas atividades do catálogo este arquétipo cobre
  /**
   * Caminho do chunk lazy a ser carregado quando o player abrir.
   * Cada arquétipo vira `src/features/library/runners/{id}/Player.tsx` em S3.
   * Por enquanto o caminho é só um marcador — não há import real ainda.
   */
  runnerModulePath: `runners/${ArchetypeId}/Player`;
  reportShape: "score_with_interpretation"
             | "narrative_with_signals"
             | "categorization_map"
             | "adherence_metrics"
             | "reflective_responses";
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeMeta> = {
  quiz_scale: {
    id: "quiz_scale",
    label: "Quiz / Escala",
    shortLabel: "Escala",
    description: "Escalas validadas (PHQ-9, GAD-7, PCL-5) com auto-scoring e interpretação clínica.",
    estimatedActivities: 38,
    runnerModulePath: "runners/quiz_scale/Player",
    reportShape: "score_with_interpretation",
  },
  drag_drop: {
    id: "drag_drop",
    label: "Drag & drop",
    shortLabel: "Interativo",
    description: "Categorização e ranking visual — distorções cognitivas, valores, gatilhos.",
    estimatedActivities: 12,
    runnerModulePath: "runners/drag_drop/Player",
    reportShape: "categorization_map",
  },
  structured_form: {
    id: "structured_form",
    label: "Formulário guiado",
    shortLabel: "Formulário",
    description: "Thought records, diários de sono, planos de segurança — passo-a-passo estruturado.",
    estimatedActivities: 20,
    runnerModulePath: "runners/structured_form/Player",
    reportShape: "narrative_with_signals",
  },
  guided_timer: {
    id: "guided_timer",
    label: "Timer guiado",
    shortLabel: "Timer",
    description: "Respiração, body scan, mindfulness — fases cronometradas com áudio opcional.",
    estimatedActivities: 8,
    runnerModulePath: "runners/guided_timer/Player",
    reportShape: "adherence_metrics",
  },
  guided_script: {
    id: "guided_script",
    label: "Script guiado",
    shortLabel: "Roteiro",
    description: "Roteiros terapêuticos passo-a-passo — defusion, narrativa de trauma, autocompaixão.",
    estimatedActivities: 5,
    runnerModulePath: "runners/guided_script/Player",
    reportShape: "reflective_responses",
  },
};

export const ARCHETYPE_LIST: ArchetypeMeta[] = Object.values(ARCHETYPES);
