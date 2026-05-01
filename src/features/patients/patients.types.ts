/**
 * Tipos compartilhados da feature Pacientes.
 *
 * Importado por:
 *  - server functions (`patients.functions.ts`)
 *  - componentes UI (`./components/*`)
 *  - rota (`/_authenticated/patients`)
 *
 * Manter este arquivo livre de `process.env`, segredos e imports do
 * `*.server.ts` — ele é isomórfico.
 */

export interface PatientDTO {
  id: string;
  workspace_id: string;
  assigned_therapist_id: string;
  display_name: string;
  initials: string;
  tags: string[];
  status: "active" | "archived";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // PHI decifrado pelo servidor (null se vazio ou falha de decrypt).
  full_name: string | null;
  email: string | null;
  phone: string | null;
  clinical_flags?: {
    total: number;
    latest_flag: string | null;
    latest_at: string | null;
  };
}

export type PatientStatusFilter = "active" | "archived";

export interface PatientUsage {
  /** active + archived. Excluídos NÃO contam (somem em 30d). */
  used: number;
  /** Breakdown pra UI explicar a contagem. */
  active: number;
  archived: number;
  deleted: number;
  /** null = ilimitado (Clinic). */
  max: number | null;
  tier: string;
}

export interface DeletedPatientItem {
  id: string;
  display_name: string;
  initials: string;
  tags: string[];
  deleted_at: string;
  days_left: number;
}

/**
 * Marker estruturado devolvido pelo servidor quando o limite de pacientes é
 * atingido. Formato: `__LIMIT_REACHED__:<tier>:<max>`.
 *
 * O servidor é a fonte da verdade — `getPatientUsage` no client é só
 * preview/banner. Se a query estiver desatualizada, ausente, ou falhar, a
 * UI ainda recebe `tier` e `max` autoritativos via este marker pra montar
 * o modal correto.
 */
export const LIMIT_REACHED_PREFIX = "__LIMIT_REACHED__";

export interface LimitReachedInfo {
  tier: string;
  max: number;
}

export function isLimitReachedError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith(LIMIT_REACHED_PREFIX);
}

export function parseLimitReachedError(err: unknown): LimitReachedInfo | null {
  if (!(err instanceof Error)) return null;
  if (!err.message.startsWith(LIMIT_REACHED_PREFIX)) return null;
  const parts = err.message.split(":");
  // [__LIMIT_REACHED__, tier, max]
  const tier = parts[1] ?? "basic";
  const max = Number.parseInt(parts[2] ?? "0", 10);
  return {
    tier,
    max: Number.isFinite(max) && max > 0 ? max : 0,
  };
}
