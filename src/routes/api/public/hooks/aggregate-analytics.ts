/**
 * Cron endpoint for daily analytics aggregation.
 *
 * POST /api/public/hooks/aggregate-analytics
 * Header: x-analytics-secret: <ANALYTICS_HOOK_SECRET>
 *
 * Aggregates audit_logs + habit_entries from yesterday into
 * platform_analytics. Called daily at 3h UTC via pg_cron.
 */

import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { aggregatePlatformAnalytics } from "@/features/analytics/aggregate-analytics.server";

export const Route = createFileRoute("/api/public/hooks/aggregate-analytics")(
  {
    server: {
      handlers: {
        POST: async ({ request }) => {
          const secret = request.headers.get("x-analytics-secret");
          const expected = process.env.ANALYTICS_HOOK_SECRET;

          if (!expected || !secret) {
            return new Response("Unauthorized", { status: 401 });
          }

          try {
            if (
              !timingSafeEqual(
                Buffer.from(secret),
                Buffer.from(expected),
              )
            ) {
              return new Response("Unauthorized", { status: 401 });
            }
          } catch {
            return new Response("Unauthorized", { status: 401 });
          }

          // Aggregate yesterday
          const yesterday = new Date();
          yesterday.setUTCDate(yesterday.getUTCDate() - 1);
          const dateStr = yesterday.toISOString().slice(0, 10);

          const result = await aggregatePlatformAnalytics(dateStr);

          return Response.json({
            ok: true,
            date: dateStr,
            ...result,
          });
        },
      },
    },
  },
);
