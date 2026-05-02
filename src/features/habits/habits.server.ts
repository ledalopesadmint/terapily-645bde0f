/**
 * Habit tracker — server-only helpers.
 *
 * Handles habit_links (reusable tokens for mindfulness/habit activities)
 * and habit_entries (individual execution records).
 *
 * Uses supabaseAdmin (service role) because:
 *  - Entry submission happens without auth session (public habit link).
 *  - Link creation crosses patient + workspace + plan checks.
 *
 * NUNCA importar deste arquivo no cliente.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";

export async function getHabitLinkByTokenHash(tokenHash: string) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("habit_links")
      .select(
        "id, workspace_id, patient_id, activity_id, assigned_by, status, expires_at, total_entries, last_entry_at, consent_accepted_at",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle(),
  );
  if (error) throw new Error("Falha ao consultar link de hábito.");
  return data;
}

export async function getActiveHabitLink(
  workspaceId: string,
  patientId: string,
  activityId: string,
) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("habit_links")
      .select("id, token_hash, status, expires_at, total_entries")
      .eq("workspace_id", workspaceId)
      .eq("patient_id", patientId)
      .eq("activity_id", activityId)
      .eq("status", "active")
      .maybeSingle(),
  );
  if (error) throw new Error("Falha ao consultar link de hábito existente.");
  return data;
}

export async function insertHabitEntry(entry: {
  habit_link_id: string;
  workspace_id: string;
  patient_id: string;
  activity_id: string;
  duration_seconds?: number;
  cycles_completed?: number;
  metadata_encrypted?: string;
  ip?: string;
  user_agent?: string;
}) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("habit_entries")
      .insert(entry)
      .select("id, completed_at")
      .single(),
  );
  if (error) {
    console.error("[insertHabitEntry] failed", { code: error.code });
    throw new Error("Falha ao registrar execução.");
  }
  return data;
}

export async function getHabitEntries(
  habitLinkId: string,
  limit = 100,
) {
  const { data, error } = await withRetry(() =>
    supabaseAdmin
      .from("habit_entries")
      .select("id, completed_at, duration_seconds, cycles_completed, created_at")
      .eq("habit_link_id", habitLinkId)
      .order("completed_at", { ascending: false })
      .limit(limit),
  );
  if (error) throw new Error("Falha ao carregar histórico.");
  return data ?? [];
}
