/**
 * Scoring engine (S3) — genérico para arquetipo `quiz_scale`.
 *
 * SERVER-ONLY. Lê `activity_catalog.config` JSONB e calcula score + severidade
 * a partir das respostas brutas. Não armazena PHI no resultado — só números
 * e enums clínicos.
 *
 * Schema esperado de `config` para quiz_scale:
 * {
 *   "scoring": {
 *     "type": "sum",                          // sum | weighted_sum
 *     "questions": [{ "id": "q1", "weight": 1 }, ...],
 *     "reverse": ["q3"],                      // opcional: itens reverse-coded
 *     "max_per_item": 3                       // usado se reverse
 *   },
 *   "severity_bands": [
 *     { "min": 0,  "max": 4,  "label": "minimal" },
 *     { "min": 5,  "max": 9,  "label": "mild" },
 *     { "min": 10, "max": 14, "label": "moderate" },
 *     { "min": 15, "max": 19, "label": "moderately_severe" },
 *     { "min": 20, "max": 27, "label": "severe" }
 *   ]
 * }
 *
 * Respostas esperadas: { q1: 2, q2: 0, ... } (numéricas).
 */

export type Severity =
  | "minimal"
  | "mild"
  | "moderate"
  | "moderately_severe"
  | "severe"
  | "not_applicable";

export interface ScoringResult {
  score: number | null;
  severity: Severity;
  metadata: Record<string, unknown>;
}

interface QuestionSpec {
  id: string;
  weight?: number;
}

interface ScoringConfig {
  scoring?: {
    type?: "sum" | "weighted_sum" | "mean";
    questions?: QuestionSpec[];
    reverse?: string[];
    max_per_item?: number;
    /** PCL-5 style cluster subscores. Keys = cluster name, values = question ids. */
    clusters?: Record<string, string[]>;
  };
  severity_bands?: Array<{
    min: number;
    max: number;
    label: Severity;
  }>;
}

const VALID_SEVERITIES: Severity[] = [
  "minimal",
  "mild",
  "moderate",
  "moderately_severe",
  "severe",
  "not_applicable",
];

/** Map descriptive band labels to standard severity enum via keyword matching. */
function mapLabelToSeverity(label: string): Severity {
  const l = label.toLowerCase();
  if (/\bextrem/.test(l) && /\bsevere\b/.test(l)) return "severe";
  if (/\bmoderate(?:ly)?[\s_-]*severe\b/.test(l)) return "moderately_severe";
  if (/\bsevere\b/.test(l) || /\bprobable\b/.test(l) || /\bhigh risk\b/.test(l) || /\bintensive\b/.test(l) || /\bclinical range\b/.test(l) || /\bclinically significant\b/.test(l)) return "severe";
  if (/\bmoderate\b/.test(l) || /\bpossible\b/.test(l) || /\bsubstantial\b/.test(l) || /\bnear threshold\b/.test(l)) return "moderate";
  if (/\bmild\b/.test(l) || /\blow[\s_-](?:to[\s_-])?moderate\b/.test(l) || /\bhazardous\b/.test(l) || /\bhigher normal\b/.test(l) || /\bpositive screen\b/.test(l)) return "mild";
  if (/\bminimal\b/.test(l) || /\bnone\b/.test(l) || /\bnegative screen\b/.test(l) || /\bnormal\b/.test(l) || /\blow\b/.test(l) || /\bno\b/.test(l) || /\bgood\b/.test(l) || /\bsubclinical\b/.test(l) || /\bwell\b/.test(l) || /\badequate\b/.test(l)) return "minimal";
  return "moderate"; // fallback for unrecognized labels
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function scoreActivity(
  archetype: string,
  config: unknown,
  responses: Record<string, unknown>,
): ScoringResult {
  // Apenas quiz_scale é auto-scored em S3. Outros arquétipos retornam not_applicable.
  if (archetype !== "quiz_scale") {
    return {
      score: null,
      severity: "not_applicable",
      metadata: { archetype, reason: "not_auto_scored_in_s3" },
    };
  }

  const cfg = (config ?? {}) as ScoringConfig;
  const scoring = cfg.scoring;
  const bands = cfg.severity_bands ?? [];

  if (!scoring || !Array.isArray(scoring.questions) || scoring.questions.length === 0) {
    return {
      score: null,
      severity: "not_applicable",
      metadata: { reason: "no_scoring_config" },
    };
  }

  const reverseSet = new Set(scoring.reverse ?? []);
  const maxPerItem = isFiniteNumber(scoring.max_per_item) ? scoring.max_per_item : null;
  const type = scoring.type ?? "sum";

  let total = 0;
  let answered = 0;
  const missing: string[] = [];

  for (const q of scoring.questions) {
    const raw = responses[q.id];
    if (!isFiniteNumber(raw)) {
      missing.push(q.id);
      continue;
    }
    let value = raw;
    if (reverseSet.has(q.id) && maxPerItem !== null) {
      value = maxPerItem - value;
    }
    const weight = type === "weighted_sum" ? (q.weight ?? 1) : 1;
    total += value * weight;
    answered += 1;
  }

  const expected = scoring.questions.length;
  const completionRate = expected > 0 ? answered / expected : 0;

  // Se mais de 20% dos itens estão faltando, não pontuamos.
  if (completionRate < 0.8) {
    return {
      score: null,
      severity: "not_applicable",
      metadata: {
        reason: "insufficient_responses",
        answered,
        expected,
        missing_count: missing.length,
      },
    };
  }

  // Mean scoring: divide total by number of answered items
  const finalScore = type === "mean" && answered > 0
    ? Number((total / answered).toFixed(2))
    : total;

  // Severidade — match raw band label, then map to standard enum
  let severity: Severity = "not_applicable";
  let severityLabel: string | null = null;
  for (const band of bands) {
    if (finalScore >= band.min && finalScore <= band.max) {
      severityLabel = band.label;
      // Try exact match first
      if (VALID_SEVERITIES.includes(band.label as Severity)) {
        severity = band.label as Severity;
      } else {
        // Best-effort mapping from descriptive labels to standard enum
        severity = mapLabelToSeverity(band.label);
      }
      break;
    }
  }

  // Cluster subscores (e.g. PCL-5)
  const clusterScores: Record<string, number> = {};
  if (scoring.clusters && typeof scoring.clusters === "object") {
    for (const [clusterName, itemIds] of Object.entries(scoring.clusters)) {
      if (!Array.isArray(itemIds)) continue;
      let clusterTotal = 0;
      for (const itemId of itemIds) {
        const raw = responses[itemId];
        if (isFiniteNumber(raw)) {
          let value = raw;
          if (reverseSet.has(itemId) && maxPerItem !== null) {
            value = maxPerItem - value;
          }
          clusterTotal += value;
        }
      }
      clusterScores[clusterName] = clusterTotal;
    }
  }

  return {
    score: total,
    severity,
    metadata: {
      type,
      answered,
      expected,
      completion_rate: Number(completionRate.toFixed(2)),
      ...(severityLabel ? { severity_label: severityLabel } : {}),
      ...(Object.keys(clusterScores).length > 0 ? { clusters: clusterScores } : {}),
    },
  };
}
