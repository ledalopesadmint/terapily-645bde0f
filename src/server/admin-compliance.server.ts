/**
 * Admin Compliance Console — server-only queries.
 * Uses requireSupabaseAuth (admin's own RLS) for workspace/patient/activity reads.
 * All queries are SELECT-only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Workspace listing ─────────────────────────────────────── */

export async function listWorkspacesForAdmin(supabase: SupabaseClient) {
  // workspaces + owner info + subscription tier + patient counts
  const { data: workspaces, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_at, deleted_at")
    .order("created_at", { ascending: false });

  if (wsErr) throw wsErr;

  // Enrich with members, subscriptions, patient counts
  const enriched = await Promise.all(
    (workspaces ?? []).map(async (ws) => {
      const [membersRes, subRes, patientCountRes] = await Promise.all([
        supabase
          .from("workspace_members")
          .select("user_id, role, created_at, deleted_at")
          .eq("workspace_id", ws.id),
        supabase
          .from("subscriptions")
          .select("tier, status, provider")
          .eq("workspace_id", ws.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws.id)
          .is("deleted_at", null),
      ]);

      const activeMembers = (membersRes.data ?? []).filter((m) => !m.deleted_at);
      const owner = activeMembers.find((m) => m.role === "owner");

      return {
        ...ws,
        owner_id: owner?.user_id ?? null,
        member_count: activeMembers.length,
        tier: subRes.data?.tier ?? "trial",
        sub_status: subRes.data?.status ?? "trialing",
        active_patients: patientCountRes.count ?? 0,
      };
    }),
  );

  return enriched;
}

/* ─── Workspace detail: members + patients ───────────────────── */

export async function getWorkspaceDetail(supabase: SupabaseClient, workspaceId: string) {
  const [membersRes, patientsRes, profilesRes] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role, created_at, deleted_at")
      .eq("workspace_id", workspaceId)
      .order("created_at"),
    supabase
      .from("patients")
      .select("id, display_name, initials, status, assigned_therapist_id, created_at, deleted_at, purged_at, tags")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (patientsRes.error) throw patientsRes.error;

  // Build profile lookup
  const profileMap = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    profileMap.set(p.id, p.full_name ?? "—");
  }

  const members = (membersRes.data ?? []).map((m) => ({
    ...m,
    full_name: profileMap.get(m.user_id) ?? "—",
  }));

  return {
    members,
    patients: patientsRes.data ?? [],
    profileMap: Object.fromEntries(profileMap),
  };
}

/* ─── Patient activity history ───────────────────────────────── */

export async function getPatientActivityHistory(
  supabase: SupabaseClient,
  workspaceId: string,
  patientId: string,
) {
  const [activitiesRes, ephemeralRes, habitsRes, consentsRes, auditRes] = await Promise.all([
    supabase
      .from("patient_activities")
      .select("id, activity_id, delivery_mode, status, created_at, used_at, token_expires_at, assigned_by, revocation_reason")
      .eq("workspace_id", workspaceId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ephemeral_activities")
      .select("id, activity_id, delivery_mode, status, created_at, used_at, token_expires_at, assigned_by, purge_after, pdf_download_count")
      .eq("workspace_id", workspaceId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("habit_links")
      .select("id, activity_id, status, created_at, expires_at, total_entries, last_entry_at, assigned_by")
      .eq("workspace_id", workspaceId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_consents")
      .select("id, patient_activity_id, accepted, consent_version, decided_at")
      .eq("workspace_id", workspaceId)
      .eq("patient_id", patientId)
      .order("decided_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, actor_id, created_at, metadata")
      .eq("workspace_id", workspaceId)
      .or(`metadata->>patient_id.eq.${patientId},resource_id.eq.${patientId}`)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return {
    activities: activitiesRes.data ?? [],
    ephemeral: ephemeralRes.data ?? [],
    habits: habitsRes.data ?? [],
    consents: consentsRes.data ?? [],
    auditLogs: auditRes.data ?? [],
  };
}
