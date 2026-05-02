/**
 * Helpers SERVER-ONLY pra o domínio de patient_activities.
 *
 * Tudo aqui usa `supabaseAdmin` (service role) porque:
 *  - Submissão pelo paciente acontece sem sessão (magic link).
 *  - Geração de link precisa cruzar paciente + workspace + plano.
 *  - Audit/RLS de patient_activities permite leitura via authenticated client,
 *    mas writes sensíveis (used_at, response, status) ficam na server side.
 *
 * NUNCA importar deste arquivo no cliente.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";

export type DeliveryMode = "in_session" | "shared_link" | "both";
export type PatientActivityStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "expired"
  | "revoked";

/** Busca paciente garantindo workspace + ativo (não soft-deleted). */
export async function getActivePatientForWorkspace(
  patientId: string,
  workspaceId: string,
) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("patients")
      .select("id, workspace_id, assigned_therapist_id, deleted_at, purged_at")
      .eq("id", patientId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("purged_at", null)
      .maybeSingle(),
  );

  if (error) throw new Error("Falha ao consultar paciente.");
  return data;
}

export async function getActivityFromCatalog(activityId: string) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("activity_catalog")
      .select("id, slug, title, archetype, config, status")
      .eq("id", activityId)
      .maybeSingle(),
  );

  if (error) throw new Error("Falha ao consultar atividade.");
  return data;
}

export async function getPatientActivityByTokenHash(tokenHash: string) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("patient_activities")
      .select(
        "id, workspace_id, patient_id, assigned_by, activity_id, delivery_mode, status, token_hash, token_expires_at, token_first_opened_at, token_open_count, used_at",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle(),
  );

  if (error) throw new Error("Falha ao consultar atividade.");
  return data;
}
