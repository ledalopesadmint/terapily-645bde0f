/**
 * /admin/analytics — Dashboard de analytics com dados reais.
 *
 * Admin-only. Combina:
 *  - platform_analytics (dados agregados da plataforma, admin)
 *  - useAnalytics (dados por workspace do terapeuta)
 *
 * Filtros de período, alertas, exportação CSV + PDF.
 */

import { useState, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  RefreshCw,
  AlertTriangle,
  Activity,
  BarChart3,
  ShoppingBag,
  Zap,
  FileText,
  Users,
  Link2,
  CheckCircle2,
  Target,
  AlertCircle,
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
import { reportClientError } from "@/features/analytics/analytics.functions";
import type { WeeklyInsight } from "@/features/analytics/weekly-insights.server";
import {
  useAnalytics,
  type PeriodPreset,
} from "@/features/analytics/useAnalytics";
import {
  ANALYTICS_ALERT_THRESHOLDS,
  type AnalyticsAlert,
} from "@/features/analytics/analytics-alerts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalyticsPage,
  errorComponent: ({ error }) => {
    // Track client error
    void reportClientError({ data: { route: "/admin/analytics", errorName: error?.name ?? "UnknownError" } });
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <AlertTriangle className="h-10 w-10 text-destructive/50" />
        <p className="text-sm text-muted-foreground">Erro ao carregar analytics.</p>
        <p className="text-xs text-muted-foreground">{error?.message}</p>
      </div>
    );
  },
});

const CHART_COLORS = {
  sage: "#7E9B86",
  navy: "#1F2A36",
  cream: "#F4EFE6",
  mauve: "#B89BA3",
  charcoal: "#3A3F47",
  teal: "#2A9D8F",
  coral: "#E76F51",
};

type TabKey = "overview" | "commercial" | "engagement" | "product" | "errors";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Visão Geral", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "commercial", label: "Comercial", icon: <ShoppingBag className="h-4 w-4" /> },
  { key: "engagement", label: "Engajamento", icon: <Activity className="h-4 w-4" /> },
  { key: "product", label: "Produto", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "errors", label: "Erros", icon: <Zap className="h-4 w-4" /> },
];

const PERIOD_OPTIONS: { key: PeriodPreset; label: string; days: number }[] = [
  { key: "today", label: "Hoje", days: 1 },
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "90 dias", days: 90 },
  { key: "month", label: "Mês atual", days: 30 },
];

function AdminAnalyticsPage() {
  const { hasRole } = useAuth();
  const analytics = useAnalytics();
  const [platformData, setPlatformData] = useState<AnalyticsDashboardPayload | null>(null);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const currentDays = PERIOD_OPTIONS.find((p) => p.key === analytics.period)?.days ?? 30;

  const loadPlatformData = useCallback(async () => {
    setPlatformLoading(true);
    try {
      const result = await getAnalyticsDashboard({ data: { days: currentDays } });
      setPlatformData(result);
    } catch (err) {
      toast.error("Erro ao carregar analytics de plataforma.");
      void reportClientError({ data: { route: "/admin/analytics", errorName: "platformLoadFailed" } });
    } finally {
      setPlatformLoading(false);
    }
  }, [currentDays]);

  // Load platform data when period changes
  useEffect(() => {
    if (hasRole("admin")) void loadPlatformData();
  }, [hasRole, loadPlatformData]);

  const handlePeriodChange = (preset: PeriodPreset) => {
    analytics.setPeriod(preset);
    // Reload platform data with corresponding days
    const days = PERIOD_OPTIONS.find((p) => p.key === preset)?.days ?? 30;
    setPlatformLoading(true);
    getAnalyticsDashboard({ data: { days } })
      .then((result) => setPlatformData(result))
      .catch(() => toast.error("Erro ao recarregar dados."))
      .finally(() => setPlatformLoading(false));
  };

  const handleAggregate = async () => {
    setAggregating(true);
    try {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);
      const result = await triggerAggregation({ data: { date: dateStr } });
      toast.success(`Agregado: ${result.inserted} métricas para ${dateStr}`);
      void loadPlatformData();
    } catch {
      toast.error("Falha na agregação.");
    } finally {
      setAggregating(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { csv } = await exportAnalyticsCSV({ data: { days: currentDays } });
      downloadBlob(csv, "text/csv;charset=utf-8;", `terapily-analytics-${currentDays}d.csv`);
      toast.success("CSV exportado.");
    } catch {
      toast.error("Falha no export CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const pdfContent = generatePDFContent(analytics.data, platformData, analytics.period, currentDays);
      downloadBlob(pdfContent, "text/html;charset=utf-8;", `terapily-analytics-${currentDays}d.html`);
      toast.success("Relatório exportado (HTML para impressão).");
    } catch {
      toast.error("Falha no export.");
    } finally {
      setExporting(false);
    }
  };

  // Generate alerts from platform data
  const alerts = computeAlerts(platformData?.rows ?? []);

  const isLoading = analytics.isLoading || platformLoading;

  // No workspace
  if (!analytics.hasWorkspace) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum workspace encontrado.</p>
      </div>
    );
  }

  // Error
  if (analytics.error) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <AlertTriangle className="h-10 w-10 text-destructive/50" />
        <p className="text-sm text-muted-foreground">Erro ao carregar métricas.</p>
        <p className="text-xs text-muted-foreground">{analytics.error.message}</p>
        <button onClick={() => analytics.refetch()} className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow className="text-mauve">Analytics</Eyebrow>
          <p className="text-sm text-muted-foreground">Métricas reais da plataforma e workspace</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handlePeriodChange(opt.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                analytics.period === opt.key
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
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      {/* Insights */}
      {platformData?.insights && platformData.insights.length > 0 && (
        <InsightsPanel insights={platformData.insights} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      ) : activeTab === "overview" ? (
        <OverviewTab data={analytics.data} />
      ) : (
        <PlatformTabContent tab={activeTab} rows={platformData?.rows ?? []} />
      )}
    </div>
  );
}

// ─── Alerts ──────────────────────────────────────────────────

function computeAlerts(rows: AnalyticsRow[]): AnalyticsAlert[] {
  const alerts: AnalyticsAlert[] = [];
  const errorRows = rows.filter((r) => r.metric.startsWith("error."));

  // Total errors in period
  const totalErrors = errorRows.reduce((s, r) => s + r.value, 0);
  if (totalErrors > ANALYTICS_ALERT_THRESHOLDS.errorCountThreshold) {
    alerts.push({
      id: "high-error-count",
      level: totalErrors > ANALYTICS_ALERT_THRESHOLDS.errorCountThreshold * 3 ? "critical" : "warning",
      title: "Volume alto de erros",
      description: `${totalErrors} erros registrados no período (limite: ${ANALYTICS_ALERT_THRESHOLDS.errorCountThreshold}).`,
    });
  }

  // Distinct error pages
  const errorPages = new Set(errorRows.filter((r) => r.metric.startsWith("error.client.")).map((r) => r.metric));
  if (errorPages.size >= ANALYTICS_ALERT_THRESHOLDS.failedPagesThreshold) {
    alerts.push({
      id: "many-failed-pages",
      level: "warning",
      title: "Múltiplas páginas com erro",
      description: `${errorPages.size} rotas distintas com erros (limite: ${ANALYTICS_ALERT_THRESHOLDS.failedPagesThreshold}).`,
    });
  }

  // Recurrent errors (same metric across multiple days)
  const errorByDay = new Map<string, Set<string>>();
  for (const r of errorRows) {
    if (!errorByDay.has(r.metric)) errorByDay.set(r.metric, new Set());
    errorByDay.get(r.metric)!.add(r.date);
  }
  for (const [metric, days] of errorByDay) {
    if (days.size >= ANALYTICS_ALERT_THRESHOLDS.recurrentErrorDays) {
      alerts.push({
        id: `recurrent-${metric}`,
        level: "critical",
        title: "Erro recorrente detectado",
        description: `"${metric}" ocorreu em ${days.size} dias distintos.`,
      });
    }
  }

  return alerts;
}

function AlertsPanel({ alerts }: { alerts: AnalyticsAlert[] }) {
  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
            alert.level === "critical"
              ? "border-destructive/40 bg-destructive/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${
            alert.level === "critical" ? "text-destructive" : "text-amber-600"
          }`} />
          <div>
            <p className="text-sm font-medium text-foreground">{alert.title}</p>
            <p className="text-xs text-muted-foreground">{alert.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Overview Tab (therapist data from useAnalytics) ─────────

function OverviewTab({ data }: { data: ReturnType<typeof useAnalytics>["data"] }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sem dados no período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KPICard icon={Users} label="Pacientes ativos" value={data.totalActivePatients} color="sage" />
        <KPICard icon={FileText} label="Escalas aplicadas" value={data.totalScalesApplied} color="navy" />
        <KPICard icon={Link2} label="Habit links ativos" value={data.totalActiveHabitLinks} color="teal" />
        <KPICard icon={Target} label="Adesão média" value={`${data.averageHabitAdherence}%`} color="mauve" />
        <KPICard icon={CheckCircle2} label="Concluídas no período" value={data.activitiesCompletedInPeriod} color="charcoal" />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly mindfulness */}
        <ChartCard title="Evolução Semanal — Mindfulness" subtitle="Entradas de hábito por semana (últimas 8 semanas)">
          {data.weeklyMindfulness.some((w) => w.entries > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.weeklyMindfulness}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="entries" fill={CHART_COLORS.sage} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Top scales */}
        <ChartCard title="Escalas Mais Utilizadas" subtitle="Top 10 por aplicações">
          {data.topScales.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topScales} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="title" fontSize={10} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.navy} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Nenhuma escala aplicada." />
          )}
        </ChartCard>
      </div>

      {/* Adherence drop */}
      {data.patientsWithAdherenceDrop.length > 0 && (
        <ChartCard title="Pacientes com Queda de Adesão" subtitle="≥30% queda nos últimos 7 dias vs anteriores">
          <div className="divide-y divide-border/50">
            {data.patientsWithAdherenceDrop.map((p) => (
              <div key={p.patientId} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {p.initials}
                  </span>
                  <span className="text-sm">{p.displayName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {p.previousEntries} → {p.currentEntries}
                  </span>
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {p.dropPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    sage: "#7E9B86",
    navy: "#1F2A36",
    teal: "#2A9D8F",
    mauve: "#B89BA3",
    charcoal: "#3A3F47",
  };
  const c = colorMap[color] ?? colorMap.sage;
  return (
    <div className="rounded-xl border border-border/50 bg-card px-4 py-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: c, opacity: 0.8 }} />
      <Icon className="h-4 w-4" style={{ color: c }} />
      <p className="mt-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
    </div>
  );
}

// ─── Platform tabs (from platform_analytics aggregated data) ──

function PlatformTabContent({ tab, rows }: { tab: TabKey; rows: AnalyticsRow[] }) {
  switch (tab) {
    case "commercial":
      return <CommercialTab rows={rows} />;
    case "engagement":
      return <EngagementTab rows={rows} />;
    case "product":
      return <ProductTab rows={rows} />;
    case "errors":
      return <ErrorsTab rows={rows} />;
    default:
      return null;
  }
}

function dailySum(rows: AnalyticsRow[]): Array<{ date: string; value: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.date, (map.get(r.date) ?? 0) + r.value);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date: date.slice(5), value }));
}

function CommercialTab({ rows }: { rows: AnalyticsRow[] }) {
  const completionData = dailySum(rows.filter((r) => r.metric === "patient.completion_rate" && r.dimension === "total"));
  const completedData = dailySum(rows.filter((r) => r.metric === "patient.activities_completed"));
  const habitData = dailySum(rows.filter((r) => r.metric === "patient.habit_entries"));

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
        <ChartCard title="Atividades Completadas / Dia">
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
        <ChartCard title="Práticas de Hábito / Dia">
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

function EngagementTab({ rows }: { rows: AnalyticsRow[] }) {
  const dauData = dailySum(rows.filter((r) => r.metric === "therapist.dau"));
  const loginsData = dailySum(rows.filter((r) => r.metric === "therapist.logins"));
  const assignedData = dailySum(rows.filter((r) => r.metric === "therapist.activities_assigned"));

  // Ephemeral metrics
  const ephAssigned = rows.filter((r) => r.metric === "ephemeral.assigned").reduce((s, r) => s + r.value, 0);
  const ephCompletionRows = rows.filter((r) => r.metric === "ephemeral.completion_rate");
  const ephCompletionRate = ephCompletionRows.length > 0
    ? Math.round(ephCompletionRows.reduce((s, r) => s + r.value, 0) / ephCompletionRows.length)
    : 0;
  const ephDownloadRows = rows.filter((r) => r.metric === "ephemeral.download_rate");
  const ephDownloadRate = ephDownloadRows.length > 0
    ? Math.round(ephDownloadRows.reduce((s, r) => s + r.value, 0) / ephDownloadRows.length)
    : 0;
  const ephExpiredNoDownload = rows.filter((r) => r.metric === "ephemeral.expired_without_download").reduce((s, r) => s + r.value, 0);
  const ephAssignedDaily = dailySum(rows.filter((r) => r.metric === "ephemeral.assigned"));
  const ephSubmittedDaily = dailySum(rows.filter((r) => r.metric === "ephemeral.submitted"));
  const ephExpiredDaily = dailySum(rows.filter((r) => r.metric === "ephemeral.expired"));

  // PWA metrics
  const pwaInstallsTotal = rows.filter((r) => r.metric === "platform.pwa_installs_total").reduce((s, r) => s + r.value, 0);
  const pwaEligibleTotal = rows.filter((r) => r.metric === "platform.pwa_eligible_total").reduce((s, r) => s + r.value, 0);
  const pwaMobile = rows.filter((r) => r.metric === "platform.pwa_installs" && r.dimension === "mobile").reduce((s, r) => s + r.value, 0);
  const pwaDesktop = rows.filter((r) => r.metric === "platform.pwa_installs" && r.dimension === "desktop").reduce((s, r) => s + r.value, 0);
  const pwaTablet = rows.filter((r) => r.metric === "platform.pwa_installs" && r.dimension === "tablet").reduce((s, r) => s + r.value, 0);

  // Merge daily for ephemeral chart
  const allDates = new Set([
    ...ephAssignedDaily.map((d) => d.date),
    ...ephSubmittedDaily.map((d) => d.date),
    ...ephExpiredDaily.map((d) => d.date),
  ]);
  const ephDailyChart = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      assigned: ephAssignedDaily.find((d) => d.date === date)?.value ?? 0,
      submitted: ephSubmittedDaily.find((d) => d.date === date)?.value ?? 0,
      expired: ephExpiredDaily.find((d) => d.date === date)?.value ?? 0,
    }));

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

      {/* ── Links Efêmeros ─────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-mauve" />
          Links Efêmeros (/e/)
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniKPI label="Prescritos" value={ephAssigned} />
          <MiniKPI label="Taxa conclusão" value={`${ephCompletionRate}%`} />
          <MiniKPI label="Taxa download" value={`${ephDownloadRate}%`} />
          <MiniKPI label="Expirados s/ download" value={ephExpiredNoDownload} alert={ephExpiredNoDownload > 0} />
        </div>
        {ephDailyChart.length > 0 && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={ephDailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="assigned" name="Prescritos" stroke={CHART_COLORS.sage} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="submitted" name="Completados" stroke={CHART_COLORS.teal} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expired" name="Expirados" stroke={CHART_COLORS.coral} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Instalações PWA ────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-sage" />
          Instalações PWA
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <MiniKPI label="Total instalações" value={pwaInstallsTotal} />
          <MiniKPI label="Elegíveis" value={pwaEligibleTotal} />
          <MiniKPI label="Mobile" value={pwaMobile} />
          <MiniKPI label="Desktop" value={pwaDesktop} />
          <MiniKPI label="Tablet" value={pwaTablet} />
        </div>
      </div>
    </div>
  );
}

function MiniKPI({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${alert ? "bg-destructive/5 border border-destructive/20" : "bg-muted/50"}`}>
      <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-display text-lg ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function ProductTab({ rows }: { rows: AnalyticsRow[] }) {
  const inSession = rows.filter((r) => r.metric === "therapist.delivery_mode.in_session").reduce((s, r) => s + r.value, 0);
  const sharedLink = rows.filter((r) => r.metric === "therapist.delivery_mode.shared_link").reduce((s, r) => s + r.value, 0);
  const pieData = [
    { name: "Em sessão", value: inSession },
    { name: "Via link", value: sharedLink },
  ].filter((d) => d.value > 0);
  const linksData = dailySum(rows.filter((r) => r.metric === "therapist.links_shared"));
  const hourMap = new Map<number, number>();
  for (const r of rows.filter((r) => (r.metric === "patient.activities_completed" || r.metric === "patient.habit_entries") && r.hour_bucket != null)) {
    hourMap.set(r.hour_bucket!, (hourMap.get(r.hour_bucket!) ?? 0) + r.value);
  }
  const peakHours = Array.from(hourMap.entries()).sort(([a], [b]) => a - b).map(([hour, value]) => ({ hour: `${hour}h`, value }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Delivery Mode" subtitle="in_session vs shared_link">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
      <ChartCard title="Horários de Pico" subtitle="Atividades + hábitos por hora UTC">
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

function ErrorsTab({ rows }: { rows: AnalyticsRow[] }) {
  const errorRows = rows.filter((r) => r.metric.startsWith("error."));
  const errorTotals = new Map<string, number>();
  for (const r of errorRows) {
    errorTotals.set(r.metric, (errorTotals.get(r.metric) ?? 0) + r.value);
  }
  const sortedErrors = Array.from(errorTotals.entries()).sort(([, a], [, b]) => b - a);
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

// ─── Insights Panel ──────────────────────────────────────────

function InsightsPanel({ insights }: { insights: WeeklyInsight[] }) {
  const significantInsights = insights.filter((i) => i.current > 0 || i.previous > 0);
  if (significantInsights.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-sage" />
        Insights da Semana
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {significantInsights.map((insight) => {
          // Display value: append % for rate metrics
          const displayValue = insight.isRate
            ? `${insight.current}%`
            : insight.current;

          // Direction badge
          const isErrorMetric = insight.metric.startsWith("error");
          const isPositive =
            (insight.direction === "up" && !isErrorMetric) ||
            (insight.direction === "down" && isErrorMetric);

          return (
            <div key={insight.metric} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground truncate">{insight.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium tabular-nums">{displayValue}</span>
                {insight.direction === "new" ? (
                  <span className="text-xs font-medium text-sage">novo</span>
                ) : insight.direction === "up" || insight.direction === "down" ? (
                  <span className={`flex items-center text-xs font-medium ${isPositive ? "text-sage" : "text-mauve"}`}>
                    {insight.direction === "up"
                      ? <TrendingUp className="h-3 w-3 mr-0.5" />
                      : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {Math.abs(insight.change)}%
                  </span>
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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

// ─── PDF Export (print-ready HTML) ───────────────────────────

function generatePDFContent(
  therapistData: ReturnType<typeof useAnalytics>["data"],
  platformData: AnalyticsDashboardPayload | null,
  period: string,
  days: number,
): string {
  const now = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? `${days} dias`;

  const kpis = therapistData
    ? [
        { label: "Pacientes ativos", value: therapistData.totalActivePatients },
        { label: "Escalas aplicadas", value: therapistData.totalScalesApplied },
        { label: "Habit links ativos", value: therapistData.totalActiveHabitLinks },
        { label: "Adesão média", value: `${therapistData.averageHabitAdherence}%` },
        { label: "Concluídas no período", value: therapistData.activitiesCompletedInPeriod },
      ]
    : [];

  const topScalesHTML = (therapistData?.topScales ?? [])
    .map((s) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${s.title}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${s.count}</td></tr>`)
    .join("");

  const insightsHTML = (platformData?.insights ?? [])
    .filter((i) => i.current > 0 || i.previous > 0)
    .map((i) => {
      const val = i.isRate ? `${i.current}%` : String(i.current);
      const changeText = i.direction === "new"
        ? "novo"
        : i.direction === "flat"
          ? "—"
          : `${i.change > 0 ? "+" : ""}${i.change}%`;
      return `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${i.label}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${val}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${changeText}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Terapily Analytics — ${periodLabel}</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 40px; color: #1F2A36; font-size: 13px; }
    h1 { font-family: Cormorant, serif; font-size: 28px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; }
    .kpi-value { font-size: 22px; font-weight: 600; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; padding: 6px 8px; border-bottom: 2px solid #1F2A36; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    .footer { margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 10px; color: #999; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>terapily</h1>
  <p class="meta">Relatório de Analytics — Período: ${periodLabel} — Gerado em: ${now}</p>

  ${kpis.length > 0 ? `
  <div class="kpi-grid">
    ${kpis.map((k) => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`).join("")}
  </div>` : ""}

  ${topScalesHTML ? `
  <h2>Escalas Mais Utilizadas</h2>
  <table><thead><tr><th>Escala</th><th style="text-align:right">Aplicações</th></tr></thead><tbody>${topScalesHTML}</tbody></table>
  ` : ""}

  ${insightsHTML ? `
  <h2>Insights da Semana</h2>
  <table><thead><tr><th>Métrica</th><th style="text-align:right">Atual</th><th style="text-align:right">Variação</th></tr></thead><tbody>${insightsHTML}</tbody></table>
  ` : ""}

  <div class="footer">
    terapily.com — Relatório gerado automaticamente. Dados desidentificados.
  </div>
</body>
</html>`;
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
