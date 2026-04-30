/**
 * Gráfico de evolução de scores por escala (S3 — Bloco 3).
 *
 * Regras:
 *  - Renderiza UMA carta por escala (slug) que tenha ≥ 2 respostas completas.
 *  - Eixo Y é a faixa clínica da escala (PHQ-9: 0-27, GAD-7: 0-21 etc.).
 *    Como não temos catálogo de range no front, usamos o max observado +
 *    headroom de 20% — é só leitura visual, não diagnóstico.
 *  - Cor Sage (token --primary). Sem Mauve (Mauve só decorativo, ≤8%).
 *  - Sem PHI: tooltip mostra só score, severidade e data.
 *  - Reutiliza os dados já carregados pelo listPatientActivities — não refetch.
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ResponseLite {
  id: string;
  score: number | null;
  severity: string | null;
  submitted_at: string;
}

interface ActivityLite {
  id: string;
  status: string;
  activity?: { slug: string; title: string } | null;
  response?: ResponseLite | ResponseLite[] | null;
}

interface Point {
  ts: number;
  date: string;
  score: number;
  severity: string | null;
}

interface SeriesGroup {
  slug: string;
  title: string;
  points: Point[];
  yMax: number;
  latest: Point;
  delta: number | null;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ScoreEvolutionChart({
  activities,
}: {
  activities: ActivityLite[];
}) {
  const groups = useMemo<SeriesGroup[]>(() => {
    const buckets = new Map<string, { title: string; points: Point[] }>();

    for (const a of activities) {
      if (a.status !== "completed") continue;
      const slug = a.activity?.slug;
      if (!slug) continue;
      const r = Array.isArray(a.response) ? a.response[0] : a.response;
      if (!r || r.score == null) continue;

      const bucket = buckets.get(slug) ?? {
        title: a.activity?.title ?? slug,
        points: [],
      };
      bucket.points.push({
        ts: new Date(r.submitted_at).getTime(),
        date: formatShortDate(r.submitted_at),
        score: Number(r.score),
        severity: r.severity ?? null,
      });
      buckets.set(slug, bucket);
    }

    const result: SeriesGroup[] = [];
    for (const [slug, b] of buckets) {
      if (b.points.length < 2) continue;
      const points = b.points.sort((x, y) => x.ts - y.ts);
      const maxScore = Math.max(...points.map((p) => p.score));
      const latest = points[points.length - 1];
      const previous = points[points.length - 2];
      result.push({
        slug,
        title: b.title,
        points,
        yMax: Math.max(10, Math.ceil(maxScore * 1.2)),
        latest,
        delta: latest.score - previous.score,
      });
    }
    return result.sort((a, b) => b.latest.ts - a.latest.ts);
  }, [activities]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl text-foreground">Evolução</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((g) => (
          <ScoreCard key={g.slug} group={g} />
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ group }: { group: SeriesGroup }) {
  const { title, points, yMax, latest, delta } = group;
  const trend =
    delta == null
      ? null
      : delta < 0
      ? { label: `↓ ${Math.abs(delta)} pts`, tone: "text-primary" }
      : delta > 0
      ? { label: `↑ ${delta} pts`, tone: "text-destructive" }
      : { label: "= estável", tone: "text-muted-foreground" };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle className="text-sm font-medium text-foreground">
            {title}
          </CardTitle>
          <div className="flex items-baseline gap-2 text-xs">
            <span className="text-muted-foreground">
              {points.length} respostas
            </span>
            {trend && <span className={trend.tone}>{trend.label}</span>}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl text-foreground">
            {latest.score}
          </span>
          {latest.severity && (
            <span className="text-xs text-muted-foreground">
              · {latest.severity}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, yMax]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value: number, _name, item) => {
                  const sev = (item?.payload as Point | undefined)?.severity;
                  return [sev ? `${value} · ${sev}` : value, "Score"];
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--primary)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <ReferenceDot
                x={latest.date}
                y={latest.score}
                r={5}
                fill="var(--primary)"
                stroke="var(--background)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
