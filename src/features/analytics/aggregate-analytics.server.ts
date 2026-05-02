/**
 * Daily aggregation of platform analytics from audit_logs + habit_entries.
 *
 * Reads events from a target date, groups by hour/metric, and upserts
 * into platform_analytics. 100% desidentified — no UUIDs in output.
 *
 * NUNCA importar no client.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface AggRow {
  date: string;
  hour_bucket: number;
  day_of_week: number;
  metric: string;
  dimension: string;
  value: number;
}

/**
 * Aggregate all metrics for a given date (YYYY-MM-DD).
 * Typically called for yesterday via cron or manual trigger.
 */
export async function aggregatePlatformAnalytics(
  targetDate: string,
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: AggRow[] = [];

  const dayStart = `${targetDate}T00:00:00Z`;
  const dayEnd = `${targetDate}T23:59:59.999Z`;
  const dow = new Date(targetDate + "T12:00:00Z").getUTCDay();

  // --- Fetch audit_logs for the day ---
  const { data: logs, error: logsErr } = await supabaseAdmin
    .from("audit_logs")
    .select("action, created_at, metadata, workspace_id")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .order("created_at", { ascending: true });

  if (logsErr) {
    errors.push(`audit_logs fetch: ${logsErr.message}`);
    return { inserted: 0, errors };
  }

  // --- Fetch habit_entries for the day ---
  const { data: habits, error: habitsErr } = await supabaseAdmin
    .from("habit_entries")
    .select("completed_at, patient_id")
    .gte("completed_at", dayStart)
    .lte("completed_at", dayEnd);

  if (habitsErr) {
    errors.push(`habit_entries fetch: ${habitsErr.message}`);
  }

  // --- Group by hour helper ---
  const hourBuckets = new Map<string, number>();
  function inc(metric: string, dimension: string, hour: number) {
    const key = `${metric}|${dimension}|${hour}`;
    hourBuckets.set(key, (hourBuckets.get(key) ?? 0) + 1);
  }

  // --- Process audit_logs ---
  const workspacesByHour = new Map<number, Set<string>>();
  const workspacesDay = new Set<string>();
  const linksOpened = new Set<string>(); // by resource_id for completion_rate
  const submitted = new Set<string>();

  for (const log of logs ?? []) {
    const hour = new Date(log.created_at).getUTCHours();
    const meta = (log.metadata ?? {}) as Record<string, unknown>;

    switch (log.action) {
      case "auth.signin":
        inc("therapist.logins", "total", hour);
        if (log.workspace_id) {
          if (!workspacesByHour.has(hour)) workspacesByHour.set(hour, new Set());
          workspacesByHour.get(hour)!.add(log.workspace_id);
          workspacesDay.add(log.workspace_id);
        }
        break;

      case "activity.assigned": {
        const dm = (meta.delivery_mode as string) ?? "unknown";
        inc("therapist.activities_assigned", "total", hour);
        inc(`therapist.delivery_mode.${dm}`, "total", hour);
        break;
      }

      case "activity.share_intent":
        inc("therapist.links_shared", "total", hour);
        break;

      case "patient.created":
        inc("therapist.patients_created", "total", hour);
        break;

      case "activity.link_opened":
        inc("patient.links_opened", "total", hour);
        linksOpened.add(String(meta.patient_id ?? ""));
        break;

      case "activity.submitted":
        inc("patient.activities_completed", "total", hour);
        submitted.add(String(meta.patient_id ?? ""));
        break;

      case "activity.consent_declined":
        inc("patient.consent_declined", "total", hour);
        break;
    }
  }

  // --- Process habit_entries ---
  const habitPatients = new Set<string>();
  for (const h of habits ?? []) {
    const hour = new Date(h.completed_at).getUTCHours();
    inc("patient.habit_entries", "total", hour);
    habitPatients.add(h.patient_id);
  }

  // --- Derived daily metrics ---

  // DAU (workspaces with login)
  rows.push({
    date: targetDate,
    hour_bucket: 0, // daily aggregate stored at hour 0
    day_of_week: dow,
    metric: "therapist.dau",
    dimension: "total",
    value: workspacesDay.size,
  });

  // Completion rate (% of opened that were submitted)
  if (linksOpened.size > 0) {
    const rate = Math.round((submitted.size / linksOpened.size) * 100);
    rows.push({
      date: targetDate,
      hour_bucket: 0,
      day_of_week: dow,
      metric: "patient.completion_rate",
      dimension: "total",
      value: rate,
    });
  }

  // Habit return rate (patients with 3+ entries — computed across all entries for the link, not just today)
  // For daily simplicity, we track unique habit patients today
  rows.push({
    date: targetDate,
    hour_bucket: 0,
    day_of_week: dow,
    metric: "patient.habit_unique_patients",
    dimension: "total",
    value: habitPatients.size,
  });

  // --- Convert hour buckets to rows ---
  for (const [key, value] of hourBuckets) {
    const [metric, dimension, hourStr] = key.split("|");
    rows.push({
      date: targetDate,
      hour_bucket: parseInt(hourStr, 10),
      day_of_week: dow,
      metric,
      dimension,
      value,
    });
  }

  // --- Upsert all rows ---
  if (rows.length === 0) {
    return { inserted: 0, errors };
  }

  const { error: upsertErr } = await supabaseAdmin
    .from("platform_analytics")
    .upsert(rows, { onConflict: "date,hour_bucket,metric,dimension" });

  if (upsertErr) {
    errors.push(`upsert: ${upsertErr.message}`);
    return { inserted: 0, errors };
  }

  return { inserted: rows.length, errors };
}
