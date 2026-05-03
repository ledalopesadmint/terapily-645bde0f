/**
 * Helpers SERVER-ONLY para atividades efêmeras (/e/ links).
 *
 * Regras (ephemeral-links-architecture):
 *  - Token cru NUNCA persiste — só SHA-256 hex.
 *  - response_data_encrypted é nullificado após 24h (purge_after).
 *  - Audit metadata NUNCA contém PHI — só UUIDs e timestamps.
 *  - Entrega manual do link (sem email/SMS automático).
 *
 * NUNCA importar deste arquivo no cliente.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";

export type EphemeralActivityStatus =
  | "pending"
  | "opened"
  | "completed"
  | "expired"
  | "revoked"
  | "purged";

/** Texto de consentimento do terapeuta para a política de 24h. */
export const EPHEMERAL_CONSENT_TEXT =
  "Entendo que os dados desta atividade serão permanentemente removidos 24 horas após o preenchimento pelo paciente, e que é minha responsabilidade baixar o resultado antes desse prazo.";

/** Busca ephemeral_activity pelo token hash. */
export async function getEphemeralActivityByTokenHash(tokenHash: string) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("ephemeral_activities")
      .select(`
        id, workspace_id, patient_id, activity_id, assigned_by,
        delivery_mode, status, token_expires_at, token_first_opened_at,
        token_open_count, used_at, completed_at, purge_after,
        pdf_downloaded_at, pdf_download_count, revocation_reason,
        therapist_consent_at, therapist_consent_text_hash,
        created_at, updated_at
      `)
      .eq("token_hash", tokenHash)
      .maybeSingle(),
  );

  if (error) throw new Error("Falha ao consultar atividade efêmera.");
  return data;
}

/** Lista ephemeral activities de um paciente num workspace. */
export async function listEphemeralActivitiesForPatient(
  patientId: string,
  workspaceId: string,
) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("ephemeral_activities")
      .select(`
        id, workspace_id, patient_id, activity_id, assigned_by,
        delivery_mode, status, used_at, completed_at, purge_after,
        pdf_downloaded_at, pdf_download_count, revocation_reason,
        created_at, updated_at
      `)
      .eq("patient_id", patientId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  );

  if (error) throw new Error("Falha ao listar atividades efêmeras.");
  return data ?? [];
}

/** Busca a resposta efêmera (se ainda não purgada). */
export async function getEphemeralResponse(ephemeralActivityId: string) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("ephemeral_responses")
      .select("id, response_data_encrypted, purged_at, submitted_at, submitted_via")
      .eq("ephemeral_activity_id", ephemeralActivityId)
      .maybeSingle(),
  );

  if (error) throw new Error("Falha ao consultar resposta efêmera.");
  return data;
}
