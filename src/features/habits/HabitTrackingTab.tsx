/**
 * HabitTrackingTab — aba "Práticas" no perfil do paciente.
 *
 * Mostra habit_links ativos/expirados do paciente com:
 *  - Total de execuções e sequência (streak)
 *  - Gráfico de aderência (heatmap por semana)
 *  - Timeline das últimas entradas
 *  - Ações: revogar link
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  Clock,
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
      {/* Active links */}
      {activeLinks.map((link) => (
        <HabitLinkCard
          key={link.id}
          link={link}
          workspaceId={workspaceId}
          patientId={patientId}
        />
      ))}

      {/* Past links */}
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
      toast.error(
        e instanceof Error ? e.message : "Não foi possível revogar.",
      );
    },
  });

  const entries = entriesQuery.data?.entries ?? [];
  const isActive = link.status === "active";
  const isExpired = link.status === "expired" || new Date(link.expires_at) < new Date();

  // Calculate streak
  const uniqueDays = new Set(
    entries.map((e) => new Date(e.completed_at).toISOString().slice(0, 10)),
  );
  const streak = calculateStreak(Array.from(uniqueDays).sort().reverse());

  // Total minutes
  const totalMinutes = entries.reduce(
    (sum, e) => sum + (e.duration_seconds ?? 0),
    0,
  ) / 60;

  const activityTitle = link.activity?.title ?? "Atividade";

  if (compact) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link2Off className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            <span className="truncate text-sm text-muted-foreground">
              {activityTitle}
            </span>
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
              <CardTitle className="text-base font-medium truncate">
                {activityTitle}
              </CardTitle>
              <Badge
                variant={isActive ? "default" : "outline"}
                className="text-[0.6rem] shrink-0"
              >
                {isActive ? "Ativo" : isExpired ? "Expirado" : link.status}
              </Badge>
            </div>
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
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
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
          </div>

          {/* Heatmap (when expanded) */}
          {expanded && entries.length > 0 && (
            <WeeklyHeatmap entries={entries} />
          )}

          {/* Timeline (when expanded) */}
          {expanded && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {entriesQuery.isLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Carregando…
                </p>
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

      {/* Revoke dialog */}
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
    <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
      <div className="flex items-center justify-center text-sage/70 mb-0.5">
        {icon}
      </div>
      <p className="text-sm font-mono font-light text-foreground">{value}</p>
      <p className="text-[0.55rem] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function WeeklyHeatmap({
  entries,
}: {
  entries: Array<{ completed_at: string }>;
}) {
  // Build a 7-week heatmap (49 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: string; count: number }[] = [];

  // Count entries per day
  const countByDay: Record<string, number> = {};
  for (const e of entries) {
    const d = new Date(e.completed_at).toISOString().slice(0, 10);
    countByDay[d] = (countByDay[d] ?? 0) + 1;
  }

  for (let i = 48; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: countByDay[key] ?? 0 });
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <div>
      <p className="text-[0.6rem] text-muted-foreground mb-1.5">
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