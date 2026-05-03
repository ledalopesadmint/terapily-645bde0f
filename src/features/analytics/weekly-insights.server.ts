/**
 * Weekly insights generator.
 *
 * Compares current week (Mon-today) vs previous week for key metrics.
 * Returns factual bullet points with % variation.
 *
 * REGRAS DE CÁLCULO:
 * - Métricas de CONTAGEM (logins, atividades): SUM dos valores no período
 * - Métricas de TAXA/PERCENTUAL (completion_rate, habit_return_rate): MÉDIA ponderada dos dias com dados
 * - Variação %: (current - previous) / previous * 100. Se previous=0, mostra "novo" (change=Infinity→capped)
 *
 * NUNCA importar no client.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface WeeklyInsight {
  metric: string;
  label: string;
  current: number;
  previous: number;
  change: number; // percentage change (capped at 999 for "new" metrics)
  direction: "up" | "down" | "flat" | "new"; // "new" = had zero last week
  category: "commercial" | "engagement" | "product" | "errors";
  isRate: boolean; // true if the value is already a percentage (don't sum, average instead)
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

/**
 * SUM all values for a count-based metric in the period.
 */
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

/**
 * AVERAGE all values for a rate/percentage metric in the period.
 * Only counts days that actually have data (non-zero denominator).
 */
async function avgMetric(
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

  const values = (data ?? []).map((r) => r.value ?? 0);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

/**
 * For completion_rate specifically, recalculate from raw counts
 * (activities_completed / activities_assigned) for accuracy.
 */
async function computeCompletionRate(
  start: string,
  end: string,
): Promise<number> {
  const completed = await sumMetric("patient.activities_completed", start, end);
  const assigned = await sumMetric("therapist.activities_assigned", start, end);

  if (assigned === 0) return 0;
  return Math.round((completed / assigned) * 100);
}

// Metrics and how to aggregate them
const TRACKED_METRICS: Array<{
  metric: string;
  label: string;
  category: WeeklyInsight["category"];
  isRate: boolean; // true = average, false = sum
  computeFromRaw?: boolean; // true = use special computation instead of sumMetric/avgMetric
}> = [
  { metric: "patient.completion_rate", label: "Taxa de conclusão", category: "commercial", isRate: true, computeFromRaw: true },
  { metric: "patient.activities_completed", label: "Atividades completadas", category: "commercial", isRate: false },
  { metric: "patient.habit_entries", label: "Práticas de hábito", category: "commercial", isRate: false },
  { metric: "patient.habit_return_rate", label: "Taxa retorno hábito (%)", category: "commercial", isRate: true },
  { metric: "therapist.dau", label: "Terapeutas ativos/dia", category: "engagement", isRate: true },
  { metric: "therapist.logins", label: "Logins", category: "engagement", isRate: false },
  { metric: "therapist.activities_assigned", label: "Atividades atribuídas", category: "engagement", isRate: false },
  { metric: "therapist.links_shared", label: "Links compartilhados", category: "product", isRate: false },
  { metric: "therapist.delivery_mode.in_session", label: "Uso em sessão", category: "product", isRate: false },
  { metric: "therapist.delivery_mode.shared_link", label: "Uso via link", category: "product", isRate: false },
  { metric: "error.server", label: "Erros server", category: "errors", isRate: false },
  { metric: "error.client", label: "Erros client", category: "errors", isRate: false },
];

export async function generateWeeklyInsights(): Promise<WeeklyInsight[]> {
  const thisWeek = getWeekBounds(0);
  const lastWeek = getWeekBounds(1);

  const insights: WeeklyInsight[] = [];

  for (const { metric, label, category, isRate, computeFromRaw } of TRACKED_METRICS) {
    let current: number;
    let previous: number;

    if (computeFromRaw && metric === "patient.completion_rate") {
      // Special: recalculate from assigned vs completed counts
      current = await computeCompletionRate(thisWeek.start, thisWeek.end);
      previous = await computeCompletionRate(lastWeek.start, lastWeek.end);
    } else if (metric.startsWith("error.")) {
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
    } else if (isRate) {
      // Rate metrics: AVERAGE across days, not sum
      current = await avgMetric(metric, thisWeek.start, thisWeek.end);
      previous = await avgMetric(metric, lastWeek.start, lastWeek.end);
    } else {
      // Count metrics: SUM
      current = await sumMetric(metric, thisWeek.start, thisWeek.end);
      previous = await sumMetric(metric, lastWeek.start, lastWeek.end);
    }

    // Calculate percentage change
    let change: number;
    let direction: WeeklyInsight["direction"];

    if (previous === 0 && current === 0) {
      change = 0;
      direction = "flat";
    } else if (previous === 0 && current > 0) {
      // New metric — no meaningful % comparison possible
      change = 0;
      direction = "new";
    } else if (current === 0 && previous > 0) {
      change = -100;
      direction = "down";
    } else {
      change = Math.round(((current - previous) / previous) * 100);
      direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
    }

    insights.push({
      metric,
      label,
      current,
      previous,
      change,
      direction,
      category,
      isRate,
    });
  }

  return insights;
}
