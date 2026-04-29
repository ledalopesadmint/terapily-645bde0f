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
}

export type PatientStatusFilter = "active" | "archived";

export interface PatientUsage {
  used: number;
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
 * atingido. A UI usa o prefixo pra abrir o modal de upgrade/waitlist no
 * lugar de um toast genérico.
 */
export const LIMIT_REACHED_PREFIX = "__LIMIT_REACHED__";

export function isLimitReachedError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith(LIMIT_REACHED_PREFIX);
}
