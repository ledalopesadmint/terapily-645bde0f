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
import { useState, useCallback, useMemo } from "react";

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
  currentEntries: number;
  previousEntries: number;
  dropPercent: number;
}

export interface TherapistAnalytics {
  totalActivePatients: number;
  totalScalesApplied: number;
  totalActiveHabitLinks: number;
  averageHabitAdherence: number;
  activitiesCompletedInPeriod: number;
  weeklyMindfulness: WeeklyMindfulnessPoint[];
  topScales: ScaleUsage[];
  patientsWithAdherenceDrop: PatientAdherenceDrop[];
}

export type PeriodPreset = "today" | "7d" | "30d" | "90d" | "month" | "custom";

export interface PeriodRange {
  start: Date;
  end: Date;
}

// ─── Helpers ──────────────────────────────────────────────────

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function periodPresetToRange(preset: PeriodPreset): PeriodRange {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (preset) {
    case "today":
      start.setUTCHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setUTCDate(now.getUTCDate() - 7);
      break;
    case "30d":
      start.setUTCDate(now.getUTCDate() - 30);
      break;
    case "90d":
      start.setUTCDate(now.getUTCDate() - 90);
      break;
    case "month":
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      break;
    case "custom":
      // caller provides range
      start.setUTCDate(now.getUTCDate() - 30);
      break;
  }
  return { start, end };
}

// ─── Fetcher (consolidated queries) ──────────────────────────

async function fetchTherapistAnalytics(
  workspaceId: string,
  range: PeriodRange,
): Promise<TherapistAnalytics> {
  const now = new Date();
  const periodStart = range.start.toISOString();
  const periodEnd = range.end.toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000).toISOString();

  // Batch 1: all parallel independent queries
  const [
    activePatientRes,
    catalogRes,
    allPAsRes,
    activeLinksRes,
    completedRes,
    mindfulnessRes,
    currentEntriesRes,
    previousEntriesRes,
  ] = await Promise.all([
    // 1. Active patients count
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "active"),

    // 2. Published catalog (cached across calls)
    supabase
      .from("activity_catalog")
      .select("id, archetype, title")
      .eq("status", "published"),

    // 3. All patient_activities for workspace (for scales + top scales)
    supabase
      .from("patient_activities")
      .select("id, activity_id, status, used_at")
      .eq("workspace_id", workspaceId),

    // 4. Active habit links (with last_entry_at for adherence)
    supabase
      .from("habit_links")
      .select("id, last_entry_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .gte("expires_at", now.toISOString()),

    // 5. Completed activities in period
    supabase
      .from("patient_activities")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .gte("used_at", periodStart)
      .lte("used_at", periodEnd),

    // 6. Mindfulness entries (last 8 weeks for chart)
    supabase
      .from("habit_entries")
      .select("completed_at")
      .eq("workspace_id", workspaceId)
      .gte("completed_at", eightWeeksAgo),

    // 7-8. Adherence drop: current vs previous 7 days
    supabase
      .from("habit_entries")
      .select("patient_id")
      .eq("workspace_id", workspaceId)
      .gte("completed_at", sevenDaysAgo),

    supabase
      .from("habit_entries")
      .select("patient_id")
      .eq("workspace_id", workspaceId)
      .gte("completed_at", fourteenDaysAgo)
      .lt("completed_at", sevenDaysAgo),
  ]);

  // Process catalog map
  const catalogMap = new Map(
    (catalogRes.data ?? []).map((c) => [c.id, { archetype: c.archetype, title: c.title }]),
  );

  // Scales applied
  const allPAs = allPAsRes.data ?? [];
  const scaleOnly = allPAs
    .filter((pa) => catalogMap.get(pa.activity_id)?.archetype === "quiz_scale")
    .map((pa) => ({
      ...pa,
      title: catalogMap.get(pa.activity_id)?.title ?? "Sem título",
    }));

  // Active habit links adherence
  const activeLinks = activeLinksRes.data ?? [];
  let averageHabitAdherence = 0;
  if (activeLinks.length > 0) {
    const linksWithRecentEntry = activeLinks.filter(
      (l) => l.last_entry_at && new Date(l.last_entry_at).getTime() > new Date(sevenDaysAgo).getTime(),
    ).length;
    averageHabitAdherence = Math.round((linksWithRecentEntry / activeLinks.length) * 100);
  }

  // Weekly mindfulness
  const weekBuckets = new Map<number, number>();
  for (const entry of mindfulnessRes.data ?? []) {
    const w = getISOWeek(new Date(entry.completed_at));
    weekBuckets.set(w, (weekBuckets.get(w) ?? 0) + 1);
  }
  const currentWeek = getISOWeek(now);
  const weeklyMindfulness: WeeklyMindfulnessPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    let wk = currentWeek - i;
    if (wk <= 0) wk += 52;
    weeklyMindfulness.push({ week: `Sem ${wk}`, entries: weekBuckets.get(wk) ?? 0 });
  }

  // Top scales
  const scaleCounts = new Map<string, { title: string; count: number }>();
  for (const pa of scaleOnly) {
    const existing = scaleCounts.get(pa.activity_id);
    if (existing) existing.count++;
    else scaleCounts.set(pa.activity_id, { title: pa.title, count: 1 });
  }
  const topScales: ScaleUsage[] = Array.from(scaleCounts.entries())
    .map(([activityId, { title, count }]) => ({ activityId, title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Adherence drop
  const currentCounts = new Map<string, number>();
  for (const e of currentEntriesRes.data ?? []) {
    currentCounts.set(e.patient_id, (currentCounts.get(e.patient_id) ?? 0) + 1);
  }
  const previousCounts = new Map<string, number>();
  for (const e of previousEntriesRes.data ?? []) {
    previousCounts.set(e.patient_id, (previousCounts.get(e.patient_id) ?? 0) + 1);
  }
  const droppedPatientIds: Array<{ id: string; current: number; previous: number; drop: number }> = [];
  for (const [patientId, prev] of previousCounts) {
    if (prev < 2) continue;
    const curr = currentCounts.get(patientId) ?? 0;
    const dropPct = Math.round(((prev - curr) / prev) * 100);
    if (dropPct >= 30) droppedPatientIds.push({ id: patientId, current: curr, previous: prev, drop: dropPct });
  }

  let patientsWithAdherenceDrop: PatientAdherenceDrop[] = [];
  if (droppedPatientIds.length > 0) {
    const { data: patientInfo } = await supabase
      .from("patients")
      .select("id, display_name, initials")
      .in("id", droppedPatientIds.map((p) => p.id));

    const infoMap = new Map((patientInfo ?? []).map((p) => [p.id, p]));
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
    totalActivePatients: activePatientRes.count ?? 0,
    totalScalesApplied: scaleOnly.length,
    totalActiveHabitLinks: activeLinks.length,
    averageHabitAdherence,
    activitiesCompletedInPeriod: completedRes.count ?? 0,
    weeklyMindfulness,
    topScales,
    patientsWithAdherenceDrop,
  };
}

// ─── Hook ─────────────────────────────────────────────────────

export function useAnalytics() {
  const { workspace, isAuthenticated } = useAuth();
  const workspaceId = workspace?.id;

  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [customRange, setCustomRange] = useState<PeriodRange | null>(null);

  const range = useMemo(() => {
    if (period === "custom" && customRange) return customRange;
    return periodPresetToRange(period);
  }, [period, customRange]);

  const query = useQuery<TherapistAnalytics>({
    queryKey: ["therapist-analytics", workspaceId, period, range.start.toISOString(), range.end.toISOString()],
    queryFn: () => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      return fetchTherapistAnalytics(workspaceId, range);
    },
    enabled: isAuthenticated && !!workspaceId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const setCustomPeriod = useCallback((start: Date, end: Date) => {
    setCustomRange({ start, end });
    setPeriod("custom");
  }, []);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    period,
    setPeriod,
    setCustomPeriod,
    range,
    hasWorkspace: !!workspaceId,
  };
}
