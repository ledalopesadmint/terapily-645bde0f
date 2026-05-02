/**
 * HabitTrackingTab — aba "Práticas" no perfil do paciente.
 *
 * Mostra habit_links ativos/expirados do paciente com:
 *  - Total de execuções e sequência (streak)
 *  - Gráfico de barras (frequência diária nos últimos 30 dias)
 *  - Heatmap de 7 semanas
 *  - Timeline das últimas entradas
 *  - Botão "Gerar relatório" → PDF de progresso
 *  - Ações: revogar link
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  Flame,
  Link2,
  Link2Off,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import {
  listPatientHabitLinks,
  getHabitEntriesForLink,
  revokeHabitLink,
} from "@/features/habits/habits.functions";
import { generateHabitProgressReport } from "@/features/habits/habit-report.functions";

interface HabitTrackingTabProps {
  patientId: string;
  workspaceId: string;
}

export function HabitTrackingTab({ patientId, workspaceId }: HabitTrackingTabProps) {
  const linksQuery = useQuery({
    queryKey: ["patient-habit-links", patientId, workspaceId],
    queryFn: () =>
      listPatientHabitLinks({ data: { patientId, workspaceId } }),
    staleTime: 15_000,
  });

  const links = linksQuery.data?.links ?? [];
  const activeLinks = links.filter((l) => l.status === "active");
  const pastLinks = links.filter((l) => l.status !== "active");

  if (linksQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Carregando práticas…
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Nenhuma prática de mindfulness prescrita ainda.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Prescreva exercícios de mindfulness no Acervo usando "Gerar link".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeLinks.map((link) => (
        <HabitLinkCard
          key={link.id}
          link={link}
          workspaceId={workspaceId}
          patientId={patientId}
        />
      ))}

      {pastLinks.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Anteriores
          </p>
          {pastLinks.map((link) => (
            <HabitLinkCard
              key={link.id}
              link={link}
              workspaceId={workspaceId}
              patientId={patientId}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- HabitLinkCard -----------------------------------------------------------

interface HabitLinkData {
  id: string;
  status: string;
  expires_at: string;
  total_entries: number;
  last_entry_at: string | null;
  created_at: string;
  activity: { id: string; slug: string; title: string; archetype: string } | null;
}

interface EntryData {
  id: string;
  completed_at: string;
  duration_seconds: number | null;
  cycles_completed: number | null;
}

function HabitLinkCard({
  link,
  workspaceId,
  patientId,
  compact = false,
}: {
  link: HabitLinkData;
  workspaceId: string;
  patientId: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const entriesQuery = useQuery({
    queryKey: ["habit-entries", link.id, workspaceId],
    queryFn: () =>
      getHabitEntriesForLink({
        data: { habitLinkId: link.id, workspaceId, limit: 200 },
      }),
    enabled: expanded,
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: () =>
      revokeHabitLink({ data: { habitLinkId: link.id } }),
    onSuccess: () => {
      toast.success("Link revogado.");
      qc.invalidateQueries({
        queryKey: ["patient-habit-links", patientId, workspaceId],
      });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível revogar.");
    },
  });

  const entries: EntryData[] = entriesQuery.data?.entries ?? [];
  const isActive = link.status === "active";
  const isExpired = link.status === "expired" || new Date(link.expires_at) < new Date();

  // Calculations
  const uniqueDays = useMemo(() => {
    const set = new Set(
      entries.map((e) => new Date(e.completed_at).toISOString().slice(0, 10)),
    );
    return Array.from(set).sort().reverse();
  }, [entries]);

  const streak = useMemo(() => calculateStreak(uniqueDays), [uniqueDays]);

  const totalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) / 60,
    [entries],
  );

  const activityTitle = link.activity?.title ?? "Atividade";

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const result = await generateHabitProgressReport({
        data: {
          habitLinkId: link.id,
          workspaceId,
          patientId,
        },
      });
      // Download the PDF
      const byteArray = new Uint8Array(result.pdfBytes);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `progresso-praticas-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Relatório gerado.");
    } catch (e) {
      console.error("[HabitReport] failed", e);
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (compact) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link2Off className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            <span className="truncate text-sm text-muted-foreground">{activityTitle}</span>
            <Badge variant="outline" className="text-[0.6rem] shrink-0">
              {link.status === "revoked" ? "Revogado" : "Expirado"}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {link.total_entries} {link.total_entries === 1 ? "prática" : "práticas"}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="h-4 w-4 shrink-0 text-sage" />
              <CardTitle className="text-base font-medium truncate">{activityTitle}</CardTitle>
              <Badge
                variant={isActive ? "default" : "outline"}
                className="text-[0.6rem] shrink-0"
              >
                {isActive ? "Ativo" : isExpired ? "Expirado" : link.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {link.total_entries > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleGeneratePdf}
                  disabled={generatingPdf}
                >
                  <Download className="h-3.5 w-3.5" />
                  {generatingPdf ? "Gerando…" : "Relatório"}
                </Button>
              )}
              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => setRevokeOpen(true)}
                >
                  Revogar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            <StatMini
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              value={link.total_entries.toString()}
              label="Práticas"
            />
            <StatMini
              icon={<Flame className="h-3.5 w-3.5" />}
              value={expanded ? `${streak}d` : "—"}
              label="Sequência"
            />
            <StatMini
              icon={<Clock className="h-3.5 w-3.5" />}
              value={
                expanded
                  ? totalMinutes >= 60
                    ? `${(totalMinutes / 60).toFixed(1)}h`
                    : `${Math.round(totalMinutes)}min`
                  : "—"
              }
              label="Tempo total"
            />
            <StatMini
              icon={<Calendar className="h-3.5 w-3.5" />}
              value={expanded ? `${uniqueDays.length}` : "—"}
              label="Dias ativos"
            />
          </div>

          {/* Bar chart — daily counts (last 30 days, when expanded) */}
          {expanded && entries.length > 0 && (
            <DailyFrequencyChart entries={entries} />
          )}

          {/* Heatmap (when expanded) */}
          {expanded && entries.length > 0 && (
            <WeeklyHeatmap entries={entries} />
          )}

          {/* Streak calendar visualization */}
          {expanded && entries.length > 0 && (
            <StreakVisualization uniqueDaysDesc={uniqueDays} />
          )}

          {/* Timeline (when expanded) */}
          {expanded && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {entriesQuery.isLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Carregando…</p>
              ) : entries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhuma prática registrada.
                </p>
              ) : (
                entries.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-sage" />
                      <span className="text-xs text-foreground">
                        {new Date(entry.completed_at).toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" · "}
                        {new Date(entry.completed_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[0.65rem] text-muted-foreground">
                      {entry.cycles_completed != null && (
                        <span>{entry.cycles_completed} ciclos</span>
                      )}
                      {entry.duration_seconds != null && (
                        <span>{Math.round(entry.duration_seconds / 60)}min</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Expand toggle */}
          {link.total_entries > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Ver histórico
                </>
              )}
            </button>
          )}

          {/* Expiration info */}
          <p className="text-[0.6rem] text-muted-foreground/70">
            <Calendar className="h-3 w-3 inline mr-1" />
            {isActive
              ? `Expira em ${formatRelativeDate(link.expires_at)}`
              : `Criado em ${new Date(link.created_at).toLocaleDateString("pt-BR")}`}
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar link de prática?</AlertDialogTitle>
            <AlertDialogDescription>
              O paciente não poderá mais usar este link. O histórico de práticas será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --- Charts ------------------------------------------------------------------

function DailyFrequencyChart({ entries }: { entries: EntryData[] }) {
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countByDay: Record<string, number> = {};
    for (const e of entries) {
      const d = new Date(e.completed_at).toISOString().slice(0, 10);
      countByDay[d] = (countByDay[d] ?? 0) + 1;
    }

    const data: { date: string; label: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      data.push({
        date: key,
        label: d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
        count: countByDay[key] ?? 0,
      });
    }
    return data;
  }, [entries]);

  return (
    <div>
      <p className="text-[0.6rem] text-muted-foreground mb-2 uppercase tracking-wider font-bold">
        Frequência diária — últimos 30 dias
      </p>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.01 160 / 0.4)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 8, fill: "oklch(0.50 0.03 160)" }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 9, fill: "oklch(0.50 0.03 160)" }}
              tickLine={false}
              axisLine={false}
              width={20}
            />
            <RechartsTooltip
              contentStyle={{
                background: "oklch(0.97 0.01 160)",
                border: "1px solid oklch(0.85 0.03 160)",
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(value: number) => [`${value} prática${value !== 1 ? "s" : ""}`, "Execuções"]}
              labelFormatter={(label: string) => label}
            />
            <Bar
              dataKey="count"
              fill="oklch(0.60 0.08 160)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StreakVisualization({ uniqueDaysDesc }: { uniqueDaysDesc: string[] }) {
  const streakInfo = useMemo(() => {
    const streak = calculateStreak(uniqueDaysDesc);
    const longestStreak = calculateLongestStreak(uniqueDaysDesc);
    const totalDays = uniqueDaysDesc.length;
    // Adherence: active days / total days in range
    const sorted = [...uniqueDaysDesc].sort();
    let adherencePercent = 0;
    if (sorted.length >= 2) {
      const first = new Date(sorted[0]);
      const last = new Date(sorted[sorted.length - 1]);
      const rangeDays = Math.max(1, Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      adherencePercent = Math.round((totalDays / rangeDays) * 100);
    } else if (sorted.length === 1) {
      adherencePercent = 100;
    }
    return { streak, longestStreak, totalDays, adherencePercent };
  }, [uniqueDaysDesc]);

  return (
    <div className="rounded-xl bg-muted/20 p-3">
      <p className="text-[0.6rem] text-muted-foreground mb-2 uppercase tracking-wider font-bold">
        Sequência e aderência
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Flame className="h-3.5 w-3.5 text-[oklch(0.65_0.12_40)]" />
            <span className="text-lg font-mono font-light text-foreground">
              {streakInfo.streak}
            </span>
          </div>
          <p className="text-[0.55rem] text-muted-foreground uppercase tracking-wider">
            Sequência atual
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Flame className="h-3.5 w-3.5 text-[oklch(0.55_0.15_30)]" />
            <span className="text-lg font-mono font-light text-foreground">
              {streakInfo.longestStreak}
            </span>
          </div>
          <p className="text-[0.55rem] text-muted-foreground uppercase tracking-wider">
            Maior sequência
          </p>
        </div>
        <div className="text-center">
          <span className="text-lg font-mono font-light text-foreground">
            {streakInfo.adherencePercent}%
          </span>
          <p className="text-[0.55rem] text-muted-foreground uppercase tracking-wider">
            Aderência
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ----------------------------------------------------------

function StatMini({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 px-2 py-2 text-center">
      <div className="flex items-center justify-center text-sage/70 mb-0.5">{icon}</div>
      <p className="text-sm font-mono font-light text-foreground">{value}</p>
      <p className="text-[0.55rem] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function WeeklyHeatmap({ entries }: { entries: Array<{ completed_at: string }> }) {
  const { days, maxCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countByDay: Record<string, number> = {};
    for (const e of entries) {
      const d = new Date(e.completed_at).toISOString().slice(0, 10);
      countByDay[d] = (countByDay[d] ?? 0) + 1;
    }

    const result: { date: string; count: number }[] = [];
    for (let i = 48; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: countByDay[key] ?? 0 });
    }
    return { days: result, maxCount: Math.max(1, ...result.map((d) => d.count)) };
  }, [entries]);

  return (
    <div>
      <p className="text-[0.6rem] text-muted-foreground mb-1.5 uppercase tracking-wider font-bold">
        Últimas 7 semanas
      </p>
      <div className="flex gap-0.5 flex-wrap">
        {days.map((d) => {
          const intensity = d.count === 0 ? 0 : Math.min(1, d.count / maxCount);
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} ${d.count === 1 ? "prática" : "práticas"}`}
              className="h-3 w-3 rounded-[2px] transition-colors"
              style={{
                backgroundColor:
                  d.count === 0
                    ? "oklch(0.92 0.01 160 / 0.5)"
                    : `oklch(${0.72 - intensity * 0.2} ${0.06 + intensity * 0.04} 160)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// --- Helpers -----------------------------------------------------------------

function calculateStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;
  let streak = 1;
  const today = new Date().toISOString().slice(0, 10);
  if (sortedDatesDesc[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (sortedDatesDesc[0] !== yesterday.toISOString().slice(0, 10)) return 0;
  }
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const prev = new Date(sortedDatesDesc[i - 1]);
    const curr = new Date(sortedDatesDesc[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.abs(diff - 1) < 0.01) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateLongestStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;
  const sorted = [...sortedDatesDesc].sort(); // ascending
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.abs(diff - 1) < 0.01) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days <= 7) return `${days} dias`;
  if (days <= 30) return `${Math.ceil(days / 7)} semanas`;
  return `${Math.ceil(days / 30)} meses`;
}