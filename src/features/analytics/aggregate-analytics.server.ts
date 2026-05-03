/**
 * Daily aggregation of platform analytics from audit_logs + habit_entries + ephemeral_activities.
 *
 * Reads events from a target date, groups by hour/metric, and upserts
 * into platform_analytics. 100% desidentified — no UUIDs in output.
 *
 * NUNCA importar no client.
 *
 * ─────────────────────────────────────────────────────────────────
 * REGRA OBRIGATÓRIA (mem://preferences/analytics-mandatory-checklist):
 * Toda nova feature/link/fluxo DEVE ter métricas adicionadas aqui
 * ANTES de merge. Ver checklist completo na memória.
 * ─────────────────────────────────────────────────────────────────
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
    .select("action, created_at, metadata, workspace_id, resource_id, actor_id")
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
  const therapistsDay = new Set<string>();

  // Track by resource_id (patient_activity_id) for accurate completion_rate
  const activitiesOpened = new Set<string>();
  const activitiesSubmitted = new Set<string>();

  // Ephemeral tracking sets
  const ephemeralOpened = new Set<string>();
  const ephemeralSubmitted = new Set<string>();
  const ephemeralDownloaded = new Set<string>();
  const ephemeralPurged = new Set<string>();
  // Track download delay: resource_id → { submitted_at, downloaded_at }
  const ephemeralTimestamps = new Map<string, { submitted_at?: string; downloaded_at?: string }>();

  // PWA tracking
  let pwaInstallsMobile = 0;
  let pwaInstallsDesktop = 0;
  let pwaInstallsTablet = 0;
  let pwaEligible = 0;

  for (const log of logs ?? []) {
    const hour = new Date(log.created_at).getUTCHours();
    const meta = (log.metadata ?? {}) as Record<string, unknown>;

    switch (log.action) {
      case "auth.signin":
        inc("therapist.logins", "total", hour);
        // DAU: count unique therapists (actor_id), not workspace_id
        // because auth.signin is logged with workspace_id=null
        if (log.actor_id) {
          therapistsDay.add(log.actor_id);
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
        if (log.resource_id) activitiesOpened.add(log.resource_id);
        break;

      case "activity.submitted":
        inc("patient.activities_completed", "total", hour);
        if (log.resource_id) activitiesSubmitted.add(log.resource_id);
        break;

      case "activity.consent_declined":
        inc("patient.consent_declined", "total", hour);
        break;

      // ── Ephemeral link metrics ──────────────────────────────
      case "ephemeral.assigned":
        inc("ephemeral.assigned", "total", hour);
        break;

      case "ephemeral.consent_acknowledged":
        inc("ephemeral.consent_acknowledged", "total", hour);
        break;

      case "ephemeral.link_opened":
        inc("ephemeral.link_opened", "total", hour);
        if (log.resource_id) ephemeralOpened.add(log.resource_id);
        break;

      case "ephemeral.submitted":
        inc("ephemeral.submitted", "total", hour);
        if (log.resource_id) {
          ephemeralSubmitted.add(log.resource_id);
          if (!ephemeralTimestamps.has(log.resource_id)) {
            ephemeralTimestamps.set(log.resource_id, {});
          }
          ephemeralTimestamps.get(log.resource_id)!.submitted_at = log.created_at;
        }
        break;

      case "ephemeral.pdf_downloaded":
        inc("ephemeral.pdf_downloaded", "total", hour);
        if (log.resource_id) {
          ephemeralDownloaded.add(log.resource_id);
          if (!ephemeralTimestamps.has(log.resource_id)) {
            ephemeralTimestamps.set(log.resource_id, {});
          }
          ephemeralTimestamps.get(log.resource_id)!.downloaded_at = log.created_at;
        }
        break;

      case "ephemeral.purged":
        inc("ephemeral.expired", "total", hour);
        if (log.resource_id) ephemeralPurged.add(log.resource_id);
        break;

      case "ephemeral.status_changed":
        // tracked via other specific actions
        break;

      // ── PWA install metrics ─────────────────────────────────
      case "platform.pwa_installed": {
        const deviceType = (meta.device_type as string) ?? "unknown";
        if (deviceType === "mobile") pwaInstallsMobile++;
        else if (deviceType === "desktop") pwaInstallsDesktop++;
        else if (deviceType === "tablet") pwaInstallsTablet++;
        inc("platform.pwa_installs", deviceType, hour);
        break;
      }

      case "platform.pwa_eligible":
        pwaEligible++;
        inc("platform.pwa_eligible", "total", hour);
        break;
    }
  }

  // --- Process habit_entries ---
  const habitPatients = new Set<string>();
  const habitLinkPatients = new Map<string, Set<string>>();

  for (const h of habits ?? []) {
    const hour = new Date(h.completed_at).getUTCHours();
    inc("patient.habit_entries", "total", hour);
    habitPatients.add(h.patient_id);

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
  if (activitiesOpened.size > 0) {
    const rate = Math.round((activitiesSubmitted.size / activitiesOpened.size) * 100);
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "patient.completion_rate", dimension: "total",
      value: Math.min(rate, 100),
    });
  }

  // Habit unique patients today
  rows.push({
    date: targetDate, hour_bucket: 0, day_of_week: dow,
    metric: "patient.habit_unique_patients", dimension: "total",
    value: habitPatients.size,
  });

  // Habit return rate
  if (habitLinkPatients.size > 0) {
    const linksWithReturn = Array.from(habitLinkPatients.values())
      .filter((patients) => patients.size >= 1).length;
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

  // ── Ephemeral derived metrics ───────────────────────────────

  // Completion rate (ephemeral): submitted / opened
  if (ephemeralOpened.size > 0) {
    const rate = Math.round((ephemeralSubmitted.size / ephemeralOpened.size) * 100);
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "ephemeral.completion_rate", dimension: "total",
      value: Math.min(rate, 100),
    });
  }

  // Download rate: downloaded / submitted
  if (ephemeralSubmitted.size > 0) {
    const rate = Math.round((ephemeralDownloaded.size / ephemeralSubmitted.size) * 100);
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "ephemeral.download_rate", dimension: "total",
      value: Math.min(rate, 100),
    });
  }

  // Expired without download: purged IDs that were NOT in downloaded set
  const expiredWithoutDownload = Array.from(ephemeralPurged).filter(
    (id) => !ephemeralDownloaded.has(id),
  ).length;
  if (expiredWithoutDownload > 0) {
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "ephemeral.expired_without_download", dimension: "total",
      value: expiredWithoutDownload,
    });
  }

  // Average download delay (hours): time between submit and download
  const delays: number[] = [];
  for (const [, ts] of ephemeralTimestamps) {
    if (ts.submitted_at && ts.downloaded_at) {
      const delayMs = new Date(ts.downloaded_at).getTime() - new Date(ts.submitted_at).getTime();
      if (delayMs >= 0) delays.push(delayMs / 3600000); // to hours
    }
  }
  if (delays.length > 0) {
    const avgHours = Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10;
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "ephemeral.avg_download_delay_hours", dimension: "total",
      value: Math.round(avgHours * 10), // store as tenths of hours for integer field
    });
  }

  // ── PWA derived metrics ─────────────────────────────────────
  const totalPwaInstalls = pwaInstallsMobile + pwaInstallsDesktop + pwaInstallsTablet;
  if (totalPwaInstalls > 0) {
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "platform.pwa_installs_total", dimension: "total",
      value: totalPwaInstalls,
    });
  }
  if (pwaEligible > 0) {
    rows.push({
      date: targetDate, hour_bucket: 0, day_of_week: dow,
      metric: "platform.pwa_eligible_total", dimension: "total",
      value: pwaEligible,
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
