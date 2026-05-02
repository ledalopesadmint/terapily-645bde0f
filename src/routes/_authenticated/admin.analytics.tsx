/**
 * /admin/analytics — Dashboard de analytics da plataforma.
 *
 * Somente Leda (admin). 4 abas: Comercial, Engajamento, Produto, Erros.
 * Insights semanais no topo. Botão de agregação manual + export CSV.
 *
 * Estética: brand book v3. Cores brand nos gráficos.
 */

import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  Activity,
  BarChart3,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import {
  getAnalyticsDashboard,
  triggerAggregation,
  exportAnalyticsCSV,
  type AnalyticsDashboardPayload,
  type AnalyticsRow,
} from "@/features/analytics/analytics.functions";
import type { WeeklyInsight } from "@/features/analytics/weekly-insights.server";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalyticsPage,
});

// Brand colors for charts
const CHART_COLORS = {
  sage: "#7E9B86",
  navy: "#1F2A36",
  cream: "#F4EFE6",
  mauve: "#B89BA3",
  charcoal: "#3A3F47",
  teal: "#2A9D8F",
  coral: "#E76F51",
};

type TabKey = "commercial" | "engagement" | "product" | "errors";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "commercial", label: "Comercial", icon: <ShoppingBag className="h-4 w-4" /> },
  { key: "engagement", label: "Engajamento", icon: <Activity className="h-4 w-4" /> },
  { key: "product", label: "Produto", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "errors", label: "Erros", icon: <Zap className="h-4 w-4" /> },
];

const PERIOD_OPTIONS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

function AdminAnalyticsPage() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("commercial");
  const [days, setDays] = useState(30);

  // Auth guard is in admin.tsx layout

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAnalyticsDashboard({ data: { days } });
      setData(result);
    } catch (err) {
      toast.error("Erro ao carregar analytics.");
      console.error("[analytics] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (hasRole("admin")) void loadData();
  }, [hasRole, loadData]);

  const handleAggregate = async () => {
    setAggregating(true);
    try {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);
      const result = await triggerAggregation({ data: { date: dateStr } });
      toast.success(`Agregado: ${result.inserted} métricas para ${dateStr}`);
      void loadData();
    } catch (err) {
      toast.error("Falha na agregação.");
      console.error(err);
    } finally {
      setAggregating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { csv } = await exportAnalyticsCSV({ data: { days } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `terapily-analytics-${days}d.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado.");
    } catch (err) {
      toast.error("Falha no export.");
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow className="text-mauve">Analytics de Plataforma</Eyebrow>
          <p className="text-sm text-muted-foreground">Dados desidentificados de uso</p>
        </div>

        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                days === opt.days
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={handleAggregate}
            disabled={aggregating}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${aggregating ? "animate-spin" : ""}`} />
            Agregar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Weekly Insights */}
      {data?.insights && data.insights.length > 0 && (
        <InsightsPanel insights={data.insights} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Nenhum dado agregado ainda. Clique em "Agregar" para processar os dados de ontem.
          </p>
        </div>
      ) : (
        <TabContent tab={activeTab} rows={data.rows} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights Panel                                                      */
/* ------------------------------------------------------------------ */

function InsightsPanel({ insights }: { insights: WeeklyInsight[] }) {
  const significantInsights = insights.filter(
    (i) => i.current > 0 || i.previous > 0,
  );

  if (significantInsights.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-sage" />
        Insights da Semana
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {significantInsights.map((insight) => (
          <div
            key={insight.metric}
            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
          >
            <span className="text-sm text-muted-foreground truncate">
              {insight.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium tabular-nums">
                {insight.current}
              </span>
              {insight.direction !== "flat" && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    insight.direction === "up" && !insight.metric.startsWith("error")
                      ? "text-sage"
                      : insight.direction === "down" && insight.metric.startsWith("error")
                        ? "text-sage"
                        : "text-mauve"
                  }`}
                >
                  {insight.direction === "up" ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {Math.abs(insight.change)}%
                </span>
              )}
              {insight.direction === "flat" && (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab Content                                                         */
/* ------------------------------------------------------------------ */

function TabContent({ tab, rows }: { tab: TabKey; rows: AnalyticsRow[] }) {
  switch (tab) {
    case "commercial":
      return <CommercialTab rows={rows} />;
    case "engagement":
      return <EngagementTab rows={rows} />;
    case "product":
      return <ProductTab rows={rows} />;
    case "errors":
      return <ErrorsTab rows={rows} />;
  }
}

function filterByMetric(rows: AnalyticsRow[], prefix: string): AnalyticsRow[] {
  return rows.filter((r) => r.metric.startsWith(prefix));
}

function dailySum(rows: AnalyticsRow[]): Array<{ date: string; value: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.date, (map.get(r.date) ?? 0) + r.value);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date: date.slice(5), // MM-DD
      value,
    }));
}

/* -- Commercial Tab -- */
function CommercialTab({ rows }: { rows: AnalyticsRow[] }) {
  const completionData = dailySum(
    rows.filter((r) => r.metric === "patient.completion_rate" && r.dimension === "total"),
  );
  const completedData = dailySum(
    rows.filter((r) => r.metric === "patient.activities_completed"),
  );
  const habitData = dailySum(
    rows.filter((r) => r.metric === "patient.habit_entries"),
  );

  return (
    <div className="space-y-6">
      <ChartCard title="Taxa de Conclusão (%)" subtitle="Atividades abertas → completadas">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={completionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS.sage} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Atividades Completadas / Dia" subtitle="Total por dia">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Práticas de Hábito / Dia" subtitle="Entradas via habit link">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={habitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS.mauve} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

/* -- Engagement Tab -- */
function EngagementTab({ rows }: { rows: AnalyticsRow[] }) {
  const dauData = dailySum(rows.filter((r) => r.metric === "therapist.dau"));
  const loginsData = dailySum(rows.filter((r) => r.metric === "therapist.logins"));
  const assignedData = dailySum(rows.filter((r) => r.metric === "therapist.activities_assigned"));

  return (
    <div className="space-y-6">
      <ChartCard title="Terapeutas Ativos / Dia (DAU)" subtitle="Workspaces distintos com login">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dauData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS.navy} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Logins / Dia">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={loginsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS.sage} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Atividades Atribuídas / Dia">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={assignedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS.charcoal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

/* -- Product Tab -- */
function ProductTab({ rows }: { rows: AnalyticsRow[] }) {
  // Delivery mode pie
  const inSession = rows
    .filter((r) => r.metric === "therapist.delivery_mode.in_session")
    .reduce((s, r) => s + r.value, 0);
  const sharedLink = rows
    .filter((r) => r.metric === "therapist.delivery_mode.shared_link")
    .reduce((s, r) => s + r.value, 0);

  const pieData = [
    { name: "Em sessão", value: inSession },
    { name: "Via link", value: sharedLink },
  ].filter((d) => d.value > 0);

  const linksData = dailySum(rows.filter((r) => r.metric === "therapist.links_shared"));

  // Peak hours
  const hourMap = new Map<number, number>();
  for (const r of rows.filter(
    (r) =>
      (r.metric === "patient.activities_completed" || r.metric === "patient.habit_entries") &&
      r.hour_bucket != null,
  )) {
    hourMap.set(r.hour_bucket!, (hourMap.get(r.hour_bucket!) ?? 0) + r.value);
  }
  const peakHours = Array.from(hourMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, value]) => ({ hour: `${hour}h`, value }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Preferência de Delivery Mode" subtitle="in_session vs shared_link">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill={CHART_COLORS.sage} />
                  <Cell fill={CHART_COLORS.mauve} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Links Compartilhados / Dia">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={linksData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Horários de Pico — Pacientes" subtitle="Atividades + hábitos por hora UTC">
        {peakHours.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="hour" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS.navy} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </div>
  );
}

/* -- Errors Tab -- */
function ErrorsTab({ rows }: { rows: AnalyticsRow[] }) {
  const errorRows = rows.filter((r) => r.metric.startsWith("error."));

  // Group by metric for table
  const errorTotals = new Map<string, number>();
  for (const r of errorRows) {
    errorTotals.set(r.metric, (errorTotals.get(r.metric) ?? 0) + r.value);
  }
  const sortedErrors = Array.from(errorTotals.entries())
    .sort(([, a], [, b]) => b - a);

  // Daily total errors
  const dailyErrors = dailySum(errorRows);

  return (
    <div className="space-y-6">
      <ChartCard title="Erros / Dia" subtitle="Total de erros agregados">
        {dailyErrors.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyErrors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS.coral} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Nenhum erro registrado." />
        )}
      </ChartCard>

      {sortedErrors.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="px-5 py-3 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-coral" />
              Erros por Operação
            </h3>
          </div>
          <div className="divide-y">
            {sortedErrors.map(([metric, total]) => (
              <div key={metric} className="flex items-center justify-between px-5 py-2.5">
                <code className="text-xs text-muted-foreground font-mono">{metric}</code>
                <span className="text-sm font-medium tabular-nums">{total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedErrors.length === 0 && dailyErrors.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-2">
          <Zap className="h-8 w-8 text-sage/40" />
          <p className="text-sm text-muted-foreground">Nenhum erro registrado no período.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared components                                                   */
/* ------------------------------------------------------------------ */

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message = "Sem dados no período." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-[200px]">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
