/**
 * Lightweight error tracker for platform analytics.
 *
 * Increments counters in platform_analytics by operation + hour.
 * Zero PHI, zero stack traces, zero user identifiers.
 *
 * Usage in catch blocks:
 *   trackAnalyticsError("submitActivity", "PGRST301");
 *   trackAnalyticsError("resolveToken", "EXPIRED");
 *
 * NUNCA importar no client.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Fire-and-forget error counter.
 * Upserts into platform_analytics with metric = `error.server.{operation}`
 * or `error.magic_link` for token-related errors.
 */
export function trackAnalyticsError(
  operation: string,
  _errorCode?: string,
): void {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  const dow = now.getUTCDay();

  const metric = operation.startsWith("error.")
    ? operation
    : `error.server.${operation}`;

  // Fire and forget — never block the caller
  void supabaseAdmin
    .from("platform_analytics")
    .upsert(
      {
        date,
        hour_bucket: hour,
        day_of_week: dow,
        metric,
        dimension: "total",
        value: 1,
      },
      { onConflict: "date,hour_bucket,metric,dimension" },
    )
    .then(({ error }) => {
      if (error) {
        // Try incrementing existing row instead
        void supabaseAdmin.rpc("increment_platform_analytics" as any, {
          p_date: date,
          p_hour: hour,
          p_metric: metric,
          p_dimension: "total",
        });
      }
    });
}

/**
 * Track client-side error (called from a server function).
 * Route is sanitized to remove dynamic segments.
 */
export function trackClientError(route: string, errorName: string): void {
  // Sanitize route: remove UUIDs and dynamic segments
  const sanitized = route
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "$id")
    .replace(/\/[A-Za-z0-9_-]{20,}$/g, "/$token");

  trackAnalyticsError(`error.client.${sanitized}`);
}
