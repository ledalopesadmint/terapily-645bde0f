/**
 * Server functions for the admin analytics dashboard.
 *
 * All functions require admin role.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { aggregatePlatformAnalytics } from "./aggregate-analytics.server";
import { generateWeeklyInsights } from "./weekly-insights.server";
import type { WeeklyInsight } from "./weekly-insights.server";

function assertAdmin(claims: Record<string, unknown> | undefined, userId: string) {
  // We check via DB to be safe
  return supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle()
    .then(({ data }) => {
      if (!data) throw new Error("Forbidden");
    });
}

export interface AnalyticsRow {
  date: string;
  hour_bucket: number | null;
  day_of_week: number | null;
  metric: string;
  dimension: string;
  value: number;
}

export interface AnalyticsDashboardPayload {
  rows: AnalyticsRow[];
  insights: WeeklyInsight[];
  period: { start: string; end: string };
}

/**
 * Fetch analytics data for the dashboard.
 */
export const getAnalyticsDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        days: z.number().min(1).max(90).default(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AnalyticsDashboardPayload> => {
    await assertAdmin(undefined, context.userId);

    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - data.days);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: rows, error } = await supabaseAdmin
      .from("platform_analytics")
      .select("date, hour_bucket, day_of_week, metric, dimension, value")
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true });

    if (error) throw new Error(`Query failed: ${error.message}`);

    const insights = await generateWeeklyInsights();

    return {
      rows: (rows ?? []) as AnalyticsRow[],
      insights,
      period: { start: startStr, end: endStr },
    };
  });

/**
 * Manually trigger aggregation for a specific date.
 */
export const triggerAggregation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(undefined, context.userId);

    const result = await aggregatePlatformAnalytics(data.date);

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "analytics.manual_aggregation",
      resource_type: "platform_analytics",
      metadata: {
        date: data.date,
        inserted: result.inserted,
        errors_count: result.errors.length,
      },
    });

    return result;
  });

/**
 * Export analytics as CSV text.
 */
export const exportAnalyticsCSV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        days: z.number().min(1).max(365).default(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(undefined, context.userId);

    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - data.days);

    const { data: rows, error } = await supabaseAdmin
      .from("platform_analytics")
      .select("date, hour_bucket, day_of_week, metric, dimension, value")
      .gte("date", start.toISOString().slice(0, 10))
      .lte("date", end.toISOString().slice(0, 10))
      .order("date", { ascending: true })
      .order("metric", { ascending: true });

    if (error) throw new Error(`Export failed: ${error.message}`);

    const header = "date,hour_bucket,day_of_week,metric,dimension,value\n";
    const csv =
      header +
      (rows ?? [])
        .map(
          (r) =>
            `${r.date},${r.hour_bucket ?? ""},${r.day_of_week ?? ""},${r.metric},${r.dimension},${r.value}`,
        )
        .join("\n");

    return { csv };
  });

/**
 * Track a client-side error (called from error boundary).
 * No auth required — but rate-limited and sanitized.
 */
export const reportClientError = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        route: z.string().min(1).max(200),
        errorName: z.string().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Dynamic import to avoid bundling server code
    const { trackClientError } = await import("./error-tracker.server");
    trackClientError(data.route, data.errorName);
    return { ok: true };
  });
