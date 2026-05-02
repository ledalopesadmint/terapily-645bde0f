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
    .select("action, created_at, metadata, workspace_id, resource_id")
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
    .select("completed_at, patient_id, habit_link_id")
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
  const workspacesDay = new Set<string>();

  // Track by resource_id (patient_activity_id) for accurate completion_rate
  const activitiesOpened = new Set<string>();   // patient_activity_ids that were opened
  const activitiesSubmitted = new Set<string>(); // patient_activity_ids that were submitted

  for (const log of logs ?? []) {
    const hour = new Date(log.created_at).getUTCHours();
    const meta = (log.metadata ?? {}) as Record<string, unknown>;

    switch (log.action) {
      case "auth.signin":
        inc("therapist.logins", "total", hour);
        if (log.workspace_id) {
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
        // resource_id = patient_activity_id
        if (log.resource_id) activitiesOpened.add(log.resource_id);
        break;

      case "activity.submitted":
        inc("patient.activities_completed", "total", hour);
        // resource_id = patient_activity_id
        if (log.resource_id) activitiesSubmitted.add(log.resource_id);
        break;

      case "activity.consent_declined":
        inc("patient.consent_declined", "total", hour);
        break;
    }
  }

  // --- Process habit_entries ---
  const habitPatients = new Set<string>();
  const habitLinkPatients = new Map<string, Set<string>>(); // link_id → set of patient_ids (for return rate)

  for (const h of habits ?? []) {
    const hour = new Date(h.completed_at).getUTCHours();
    inc("patient.habit_entries", "total", hour);
    habitPatients.add(h.patient_id);

    // Track per habit_link to calculate return rate
    if (!habitLinkPatients.has(h.habit_link_id)) {
      habitLinkPatients.set(h.habit_link_id, new Set());
    }
    habitLinkPatients.get(h.habit_link_id)!.add(h.patient_id);
  }

  // --- Derived daily metrics ---

  // DAU (workspaces with login)
  rows.push({
    date: targetDate, hour_bucket: 0, day_of_week: dow,
    metric: "therapist.dau", dimension: "total", value: workspacesDay.size,
  });

  // Completion rate — based on distinct patient_activity_ids opened vs submitted
  // This is accurate: counts individual activities, not patients
  if (activitiesOpened.size > 0) {
    const rate = Math.round((activitiesSubmitted.size / activitiesOpened.size) * 100);
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "patient.completion_rate", dimension: "total",
      value: Math.min(rate, 100), // cap at 100% (submit without open same day is possible)
    });
  }

  // Habit unique patients today
  rows.push({
    date: targetDate, hour_bucket: 0, day_of_week: dow,
    metric: "patient.habit_unique_patients", dimension: "total",
    value: habitPatients.size,
  });

  // Habit return rate — % of active habit links that had ≥2 entries today
  // (proxy for "patients actually returning to practice")
  if (habitLinkPatients.size > 0) {
    const linksWithReturn = Array.from(habitLinkPatients.values())
      .filter((patients) => patients.size >= 1).length; // at least used
    // Query how many habit_links had entries in the previous 7 days too
    const { data: recentLinks } = await supabaseAdmin
      .from("habit_entries")
      .select("habit_link_id")
      .gte("completed_at", new Date(new Date(dayStart).getTime() - 7 * 86400000).toISOString())
      .lt("completed_at", dayStart);

    const previousLinkIds = new Set((recentLinks ?? []).map((r) => r.habit_link_id));
    const returningLinks = Array.from(habitLinkPatients.keys())
      .filter((linkId) => previousLinkIds.has(linkId)).length;

    const returnRate = linksWithReturn > 0
      ? Math.round((returningLinks / linksWithReturn) * 100)
      : 0;

    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "patient.habit_return_rate", dimension: "total",
      value: returnRate,
    });
  }

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
