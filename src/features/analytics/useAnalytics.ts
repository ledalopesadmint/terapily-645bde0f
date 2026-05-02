/**
 * useAnalytics — hook centralizado de métricas por terapeuta.
 *
 * Busca dados reais via Supabase client (RLS-respecting).
 * Retorna métricas prontas pra gráficos, loading, error e refetch.
 *
 * Não expõe dados de outros terapeutas — RLS filtra por workspace_member + assigned_therapist.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthProvider";

// ─── Types ────────────────────────────────────────────────────

export interface WeeklyMindfulnessPoint {
  /** ISO week label, e.g. "Sem 18" */
  week: string;
  entries: number;
}

export interface ScaleUsage {
  activityId: string;
  title: string;
  count: number;
}

export interface PatientAdherenceDrop {
  patientId: string;
  displayName: string;
  initials: string;
  /** entries in current period */
  currentEntries: number;
  /** entries in previous period */
  previousEntries: number;
  /** negative % change */
  dropPercent: number;
}

export interface TherapistAnalytics {
  /** Active patients (not deleted, not archived) */
  totalActivePatients: number;
  /** Scales applied (patient_activities with scale archetype, any status) */
  totalScalesApplied: number;
  /** Active habit links (status = 'active', not expired) */
  totalActiveHabitLinks: number;
  /** Average adherence rate across habit links (% of links with ≥1 entry in last 7 days) */
  averageHabitAdherence: number;
  /** Activities completed (status = 'completed') in last 30 days */
  activitiesCompletedLast30: number;
  /** Weekly mindfulness evolution (last 8 weeks) */
  weeklyMindfulness: WeeklyMindfulnessPoint[];
  /** Top scales by usage count */
  topScales: ScaleUsage[];
  /** Patients with adherence drop (habit entries decreased ≥30% vs previous period) */
  patientsWithAdherenceDrop: PatientAdherenceDrop[];
}

// ─── Helpers ──────────────────────────────────────────────────

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchTherapistAnalytics(workspaceId: string): Promise<TherapistAnalytics> {
  const now = new Date();
  const thirtyDaysAgo = daysAgo(30);
  const fiftyySixDaysAgo = daysAgo(56); // 8 weeks
  const sevenDaysAgo = daysAgo(7);
  const fourteenDaysAgo = daysAgo(14);

  // 1. Active patients
  const { count: activePatients } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .eq("status", "active");

  // 2. Scales applied — patient_activities joined with activity_catalog where archetype = 'scale'
  const { data: scaleActivities } = await supabase
    .from("patient_activities")
    .select("id, activity_id, activity:activity_catalog!inner(archetype, title)")
    .eq("workspace_id", workspaceId);

  const scaleOnly = (scaleActivities ?? []).filter(
    (pa: any) => pa.activity?.archetype === "scale",
  );
  const totalScalesApplied = scaleOnly.length;

  // 3. Active habit links
  const { count: activeHabitLinks } = await supabase
    .from("habit_links")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .gte("expires_at", now.toISOString());

  // 4. Average habit adherence (% of active links with entries in last 7 days)
  const { data: allActiveLinks } = await supabase
    .from("habit_links")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .gte("expires_at", now.toISOString());

  const activeLinkIds = (allActiveLinks ?? []).map((l) => l.id);
  let averageHabitAdherence = 0;

  if (activeLinkIds.length > 0) {
    const { data: recentEntries } = await supabase
      .from("habit_entries")
      .select("habit_link_id")
      .eq("workspace_id", workspaceId)
      .in("habit_link_id", activeLinkIds)
      .gte("completed_at", sevenDaysAgo);

    const linksWithRecentEntry = new Set(
      (recentEntries ?? []).map((e) => e.habit_link_id),
    );
    averageHabitAdherence = Math.round(
      (linksWithRecentEntry.size / activeLinkIds.length) * 100,
    );
  }

  // 5. Activities completed last 30 days
  const { count: completedLast30 } = await supabase
    .from("patient_activities")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .gte("used_at", thirtyDaysAgo);

  // 6. Weekly mindfulness evolution (last 8 weeks)
  const { data: mindfulnessEntries } = await supabase
    .from("habit_entries")
    .select("completed_at")
    .eq("workspace_id", workspaceId)
    .gte("completed_at", fiftyySixDaysAgo);

  const weekBuckets = new Map<number, number>();
  for (const entry of mindfulnessEntries ?? []) {
    const w = getISOWeek(new Date(entry.completed_at));
    weekBuckets.set(w, (weekBuckets.get(w) ?? 0) + 1);
  }

  // Build last 8 weeks in order
  const currentWeek = getISOWeek(now);
  const weeklyMindfulness: WeeklyMindfulnessPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    // Approximate week number (wraps at year boundary, good enough for display)
    let wk = currentWeek - i;
    if (wk <= 0) wk += 52;
    weeklyMindfulness.push({
      week: `Sem ${wk}`,
      entries: weekBuckets.get(wk) ?? 0,
    });
  }

  // 7. Top scales by usage
  const scaleCounts = new Map<string, { title: string; count: number }>();
  for (const pa of scaleOnly) {
    const aid = pa.activity_id;
    const title = (pa as any).activity?.title ?? "Sem título";
    const existing = scaleCounts.get(aid);
    if (existing) {
      existing.count++;
    } else {
      scaleCounts.set(aid, { title, count: 1 });
    }
  }
  const topScales: ScaleUsage[] = Array.from(scaleCounts.entries())
    .map(([activityId, { title, count }]) => ({ activityId, title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 8. Patients with adherence drop
  // Compare habit entries per patient: last 7 days vs previous 7 days
  const { data: currentPeriodEntries } = await supabase
    .from("habit_entries")
    .select("patient_id")
    .eq("workspace_id", workspaceId)
    .gte("completed_at", sevenDaysAgo);

  const { data: previousPeriodEntries } = await supabase
    .from("habit_entries")
    .select("patient_id")
    .eq("workspace_id", workspaceId)
    .gte("completed_at", fourteenDaysAgo)
    .lt("completed_at", sevenDaysAgo);

  const currentCounts = new Map<string, number>();
  for (const e of currentPeriodEntries ?? []) {
    currentCounts.set(e.patient_id, (currentCounts.get(e.patient_id) ?? 0) + 1);
  }

  const previousCounts = new Map<string, number>();
  for (const e of previousPeriodEntries ?? []) {
    previousCounts.set(e.patient_id, (previousCounts.get(e.patient_id) ?? 0) + 1);
  }

  // Find patients with ≥30% drop
  const droppedPatientIds: Array<{
    id: string;
    current: number;
    previous: number;
    drop: number;
  }> = [];

  for (const [patientId, prev] of previousCounts) {
    if (prev < 2) continue; // ignore low baseline
    const curr = currentCounts.get(patientId) ?? 0;
    const dropPct = Math.round(((prev - curr) / prev) * 100);
    if (dropPct >= 30) {
      droppedPatientIds.push({
        id: patientId,
        current: curr,
        previous: prev,
        drop: dropPct,
      });
    }
  }

  // Fetch patient display info for dropped patients
  let patientsWithAdherenceDrop: PatientAdherenceDrop[] = [];
  if (droppedPatientIds.length > 0) {
    const { data: patientInfo } = await supabase
      .from("patients")
      .select("id, display_name, initials")
      .in(
        "id",
        droppedPatientIds.map((p) => p.id),
      );

    const infoMap = new Map(
      (patientInfo ?? []).map((p) => [p.id, p]),
    );

    patientsWithAdherenceDrop = droppedPatientIds
      .map((d) => {
        const info = infoMap.get(d.id);
        if (!info) return null;
        return {
          patientId: d.id,
          displayName: info.display_name,
          initials: info.initials,
          currentEntries: d.current,
          previousEntries: d.previous,
          dropPercent: d.drop,
        };
      })
      .filter(Boolean) as PatientAdherenceDrop[];
  }

  return {
    totalActivePatients: activePatients ?? 0,
    totalScalesApplied,
    totalActiveHabitLinks: activeHabitLinks ?? 0,
    averageHabitAdherence,
    activitiesCompletedLast30: completedLast30 ?? 0,
    weeklyMindfulness,
    topScales,
    patientsWithAdherenceDrop,
  };
}

// ─── Hook ─────────────────────────────────────────────────────

export function useAnalytics() {
  const { workspace, isAuthenticated } = useAuth();
  const workspaceId = workspace?.id;

  const query = useQuery<TherapistAnalytics>({
    queryKey: ["therapist-analytics", workspaceId],
    queryFn: () => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      return fetchTherapistAnalytics(workspaceId);
    },
    enabled: isAuthenticated && !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
