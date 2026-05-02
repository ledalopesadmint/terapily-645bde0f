/**
 * Types for the guided_script archetype.
 *
 * A guided script is a step-by-step therapeutic exercise where:
 * - Each step has an instruction the therapist reads or the patient follows
 * - Some steps may ask the patient to write a reflection
 * - A timer may count the suggested duration per step
 * - Completion is tracked step-by-step
 */

export interface ScriptStep {
  id: string;
  /** Step title shown as a small eyebrow */
  title: string;
  /** Instruction text — the main content the patient reads/follows */
  instruction: string;
  /** Suggested duration in seconds (optional — no timer if omitted) */
  durationSec?: number;
  /** If true, shows a text area for patient reflection after the instruction */
  hasReflection?: boolean;
  /** Placeholder text for the reflection field */
  reflectionPlaceholder?: string;
  /** Optional prompt label above the text area */
  reflectionLabel?: string;
}

export interface GuidedScriptConfig {
  /** Activity code (e.g. TRA-02) */
  code?: string;
  /** Introduction text shown before the script starts */
  introduction?: string;
  /** Disclaimer text */
  disclaimer?: string;
  /** Estimated duration in minutes */
  duration_min?: number;
  /** Ordered steps of the guided script */
  steps: ScriptStep[];
  /** Supported delivery modes */
  supported_modes?: string[];
}

/** Response shape: step_id → reflection text (or "completed" for non-reflection steps) */
export type GuidedScriptResponses = Record<string, string>;
