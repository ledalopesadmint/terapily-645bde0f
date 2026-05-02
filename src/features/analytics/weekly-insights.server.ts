/**
 * Weekly insights generator.
 *
 * Compares current week (Mon-today) vs previous week for key metrics.
 * Returns factual bullet points with % variation.
 *
 * NUNCA importar no client.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface WeeklyInsight {
  metric: string;
  label: string;
  current: number;
  previous: number;
  change: number; // percentage
  direction: "up" | "down" | "flat";
  category: "commercial" | "engagement" | "product" | "errors";
}

function getWeekBounds(weeksAgo: number): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - mondayOffset - weeksAgo * 7);
  thisMonday.setUTCHours(0, 0, 0, 0);

  const endDay = weeksAgo === 0 ? now : new Date(thisMonday);
  if (weeksAgo > 0) {
    endDay.setUTCDate(thisMonday.getUTCDate() + 6);
    endDay.setUTCHours(23, 59, 59, 999);
  }

  return {
    start: thisMonday.toISOString().slice(0, 10),
    end: endDay.toISOString().slice(0, 10),
  };
}

async function sumMetric(
  metric: string,
  start: string,
  end: string,
): Promise<number> {
  const { data } = await supabaseAdmin
    .from("platform_analytics")
    .select("value")
    .eq("metric", metric)
    .eq("dimension", "total")
    .gte("date", start)
    .lte("date", end);

  return (data ?? []).reduce((sum, r) => sum + (r.value ?? 0), 0);
}

const TRACKED_METRICS: Array<{
  metric: string;
  label: string;
  category: WeeklyInsight["category"];
}> = [
  { metric: "patient.completion_rate", label: "Taxa de conclusão", category: "commercial" },
  { metric: "patient.activities_completed", label: "Atividades completadas", category: "commercial" },
  { metric: "patient.habit_entries", label: "Práticas de hábito", category: "commercial" },
  { metric: "patient.habit_return_rate", label: "Taxa retorno hábito (%)", category: "commercial" },
  { metric: "therapist.dau", label: "Terapeutas ativos/dia", category: "engagement" },
  { metric: "therapist.logins", label: "Logins", category: "engagement" },
  { metric: "therapist.activities_assigned", label: "Atividades atribuídas", category: "engagement" },
  { metric: "therapist.links_shared", label: "Links compartilhados", category: "product" },
  { metric: "therapist.delivery_mode.in_session", label: "Uso em sessão", category: "product" },
  { metric: "therapist.delivery_mode.shared_link", label: "Uso via link", category: "product" },
  { metric: "error.server", label: "Erros server", category: "errors" },
  { metric: "error.magic_link", label: "Erros magic link", category: "errors" },
];

export async function generateWeeklyInsights(): Promise<WeeklyInsight[]> {
  const thisWeek = getWeekBounds(0);
  const lastWeek = getWeekBounds(1);

  const insights: WeeklyInsight[] = [];

  for (const { metric, label, category } of TRACKED_METRICS) {
    // For error metrics, we need to sum all matching prefixes
    let current: number;
    let previous: number;

    if (metric.startsWith("error.")) {
      // Sum all error.server.* or error.magic_link etc.
      const { data: currData } = await supabaseAdmin
        .from("platform_analytics")
        .select("value")
        .like("metric", `${metric}%`)
        .eq("dimension", "total")
        .gte("date", thisWeek.start)
        .lte("date", thisWeek.end);

      const { data: prevData } = await supabaseAdmin
        .from("platform_analytics")
        .select("value")
        .like("metric", `${metric}%`)
        .eq("dimension", "total")
        .gte("date", lastWeek.start)
        .lte("date", lastWeek.end);

      current = (currData ?? []).reduce((s, r) => s + (r.value ?? 0), 0);
      previous = (prevData ?? []).reduce((s, r) => s + (r.value ?? 0), 0);
    } else {
      current = await sumMetric(metric, thisWeek.start, thisWeek.end);
      previous = await sumMetric(metric, lastWeek.start, lastWeek.end);
    }

    const change =
      previous === 0
        ? current > 0
          ? 100
          : 0
        : Math.round(((current - previous) / previous) * 100);

    insights.push({
      metric,
      label,
      current,
      previous,
      change,
      direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
      category,
    });
  }

  return insights;
}
