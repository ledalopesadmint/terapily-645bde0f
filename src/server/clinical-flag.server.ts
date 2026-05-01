/**
 * Detecção de clinical flags — lógica centralizada (SERVER-ONLY).
 *
 * Usada por:
 *   - activities.functions.ts  (fluxo in_session autenticado)
 *   - public-activities.functions.ts  (fluxo magic link público)
 *
 * Sem PHI: inspeciona apenas valores numéricos das respostas
 * contra thresholds declarados no config da atividade.
 *
 * Ciclo de flags: ACTIVE → MONITORING → ACKNOWLEDGED.
 * Ver mem://features/clinical-flag-lifecycle
 */

export interface ClinicalFlagResult {
  raised: boolean;
  flag: string | null;
  item_id: string | null;
}

/**
 * Detecta clinical flag em respostas (PHQ-9 item 9, C-SSRS, etc.).
 * Lê `clinical_flag` + `flag_threshold` (default 1) de cada item do config.
 */
export function detectClinicalFlag(
  config: unknown,
  responses: Record<string, unknown>,
): ClinicalFlagResult {
  const items = Array.isArray((config as { items?: unknown[] })?.items)
    ? ((config as { items: unknown[] }).items)
    : [];

  for (const item of items) {
    const it = item as { id?: string; clinical_flag?: string; flag_threshold?: number };
    if (!it?.clinical_flag || !it.id) continue;
    const threshold = typeof it.flag_threshold === "number" ? it.flag_threshold : 1;
    const raw = responses[it.id];
    if (typeof raw === "number" && raw >= threshold) {
      return { raised: true, flag: it.clinical_flag, item_id: it.id };
    }
  }

  return { raised: false, flag: null, item_id: null };
}
