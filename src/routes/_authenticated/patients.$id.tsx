/**
 * /patients/$id — Perfil do paciente.
 *
 * Inclui aba "Atividades" (S3 Etapa 3): lista de patient_activities,
 * botão "Enviar atividade" (modal), revogar e copiar link.
 *
 * Constraints (magic-link-rules-locked):
 *  - Token cru aparece UMA vez no modal de criação. Nunca persiste no front.
 *  - Revogar não apaga histórico — só invalida o link.
 *  - Sem PHI em URL/log/audit metadata.
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Copy, Download, Eye, Mail, MessageCircle, Play, Plus, RefreshCw, Send, ShieldCheck, Slash, Smartphone } from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import {
  getPatient,
  getPatientContactAvailability,
  revealPatientContact,
} from "@/features/patients/patients.functions";
import {
  assignActivity,
  getActivityShareSummary,
  getMyWorkspaceRole,
  listPatientActivities,
  listPatientAuditLogs,
  recordShareIntent,
  revokeActivity,
  listAvailableActivities,
  generateInSessionLink,
  acknowledgeClinicalFlag,
  type ShareSummaryRow,
} from "@/features/activities/activities.functions";
import { generateComplianceReport } from "@/features/activities/compliance-report.functions";
import { ScoreEvolutionChart } from "@/features/activities/components/ScoreEvolutionChart";
import { InSessionPlayerDialog } from "@/features/activities/components/InSessionPlayerDialog";
import { ResponseDetailDrawer } from "@/features/activities/components/ResponseDetailDrawer";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  head: () => ({
    meta: [
      { title: "Paciente · Terapily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PatientDetailPage,
});

type DeliveryMode = "in_session" | "shared_link" | "both";

type ActivityStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "expired"
  | "revoked";

const STATUS_LABEL: Record<ActivityStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Respondida",
  expired: "Expirada",
  revoked: "Revogada",
};

const STATUS_VARIANT: Record<
  ActivityStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  in_progress: "default",
  completed: "default",
  expired: "outline",
  revoked: "destructive",
};

// ============================================================
// Clinical Flag Lifecycle Types
// States: ACTIVE (risk detected) → MONITORING (resolved) → ACKNOWLEDGED
// ============================================================

type FlagLifecycleStatus = "active" | "monitoring" | "acknowledged";

interface ClinicalFlagInfo {
  flag: string;
  item_id: string | null;
  responseId: string;
  patientActivityId: string;
  activityTitle: string;
  activitySlug: string;
  submittedAt: string | null;
  submittedVia: string | null;
  score: number | null;
  severity: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

interface ClinicalFlagWithLifecycle extends ClinicalFlagInfo {
  lifecycleStatus: FlagLifecycleStatus;
  /** The response that resolved this flag (no longer triggers) */
  resolvedByResponseId?: string;
  resolvedAt?: string;
}

function getClinicalFlagFromResponse(
  response: unknown,
  activityTitle: string,
  activitySlug: string,
  patientActivityId: string,
): ClinicalFlagInfo | null {
  if (!response || typeof response !== "object") return null;
  const row = response as {
    id?: string;
    score?: number | null;
    severity?: string | null;
    submitted_at?: string | null;
    submitted_via?: string | null;
    acknowledged_at?: string | null;
    acknowledged_by?: string | null;
    scoring_metadata?: { clinical_flag?: { flag?: string; item_id?: string | null } | null } | null;
  };
  const flag = row.scoring_metadata?.clinical_flag;
  if (!row.id || !flag?.flag) return null;
  return {
    flag: flag.flag,
    item_id: flag.item_id ?? null,
    responseId: row.id,
    patientActivityId,
    activityTitle,
    activitySlug,
    submittedAt: row.submitted_at ?? null,
    submittedVia: row.submitted_via ?? null,
    score: row.score ?? null,
    severity: row.severity ?? null,
    acknowledgedAt: row.acknowledged_at ?? null,
    acknowledgedBy: row.acknowledged_by ?? null,
  };
}

/**
 * Computes clinical flag lifecycle status by comparing sequential applications
 * of the same scale (activity slug) for the same patient.
 *
 * Logic:
 * - Group all flags by activity slug
 * - For each slug, sort by submission date
 * - If the LATEST application raised a flag → ACTIVE
 * - If the LATEST did NOT raise but a previous one did → MONITORING (until acknowledged)
 * - If the therapist acknowledged → ACKNOWLEDGED (hidden from banner, visible in history)
 * - If a new application raises again after acknowledged → new ACTIVE cycle
 */
function computeFlagLifecycle(
  allActivities: Array<{
    activity?: { slug?: string; title?: string } | null;
    response?: unknown;
    id: string;
    created_at?: string;
  }>,
): ClinicalFlagWithLifecycle[] {
  // Group activities by slug
  const bySlug = new Map<string, typeof allActivities>();
  for (const a of allActivities) {
    const slug = a.activity?.slug ?? "unknown";
    const arr = bySlug.get(slug) ?? [];
    arr.push(a);
    bySlug.set(slug, arr);
  }

  const results: ClinicalFlagWithLifecycle[] = [];

  for (const [slug, slugActivities] of bySlug) {
    // Sort by created_at ascending (oldest first)
    const sorted = [...slugActivities].sort((a, b) =>
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    );

    // Extract flags from each application
    const flagsInOrder: Array<{
      flag: ClinicalFlagInfo | null;
      hasFlag: boolean;
      responseObj: unknown;
      activityId: string;
    }> = sorted.map((a) => {
      const response = Array.isArray(a.response) ? a.response[0] : a.response;
      const extracted = getClinicalFlagFromResponse(
        response,
        a.activity?.title ?? "Atividade",
        slug,
        a.id,
      );
      return {
        flag: extracted,
        hasFlag: !!extracted,
        responseObj: response,
        activityId: a.id,
      };
    });

    // Find the latest flagged response
    let latestFlagged: ClinicalFlagInfo | null = null;
    let latestFlaggedIndex = -1;
    for (let i = flagsInOrder.length - 1; i >= 0; i--) {
      if (flagsInOrder[i].hasFlag && flagsInOrder[i].flag) {
        latestFlagged = flagsInOrder[i].flag;
        latestFlaggedIndex = i;
        break;
      }
    }

    if (!latestFlagged) continue;

    // Is there a newer application (after the flagged one) that did NOT raise?
    const latestOverall = flagsInOrder[flagsInOrder.length - 1];
    const isLatestTheFlagged = latestFlaggedIndex === flagsInOrder.length - 1;

    if (isLatestTheFlagged) {
      // Latest application raised the flag
      if (latestFlagged.acknowledgedAt) {
        results.push({ ...latestFlagged, lifecycleStatus: "acknowledged" });
      } else {
        results.push({ ...latestFlagged, lifecycleStatus: "active" });
      }
    } else {
      // There's a newer application that didn't raise → MONITORING or ACKNOWLEDGED
      const resolverResponse = latestOverall.responseObj as { id?: string; submitted_at?: string } | null;
      if (latestFlagged.acknowledgedAt) {
        results.push({
          ...latestFlagged,
          lifecycleStatus: "acknowledged",
          resolvedByResponseId: resolverResponse?.id ?? undefined,
          resolvedAt: resolverResponse?.submitted_at ?? undefined,
        });
      } else {
        results.push({
          ...latestFlagged,
          lifecycleStatus: "monitoring",
          resolvedByResponseId: resolverResponse?.id ?? undefined,
          resolvedAt: resolverResponse?.submitted_at ?? undefined,
        });
      }
    }
  }

  return results;
}

function formatClinicalFlagLabel(flag: string) {
  if (flag === "suicidal_ideation") return "Ideação suicida";
  if (flag === "self_harm") return "Autolesão";
  if (flag === "homicidal_ideation") return "Ideação homicida";
  if (flag === "substance_abuse") return "Uso de substâncias";
  return flag.replace(/_/g, " ");
}

function PatientDetailPage() {
  const { id } = useParams({ from: "/_authenticated/patients/$id" });

  const patientQuery = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient({ data: { id } }),
  });

  if (patientQuery.isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando…</div>;
  }

  if (patientQuery.isError || !patientQuery.data?.patient) {
    return (
      <div className="p-6">
        <p className="text-destructive">Paciente não encontrado.</p>
        <Link to="/patients" className="text-sm underline mt-2 inline-block">
          Voltar pra lista
        </Link>
      </div>
    );
  }

  const patient = patientQuery.data.patient;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/patients" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Pacientes
        </Link>
      </div>

      <header className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-medium text-foreground">
          {patient.initials}
        </div>
        <div>
          <h1 className="font-display text-3xl text-foreground">{patient.display_name}</h1>
          <p className="text-sm text-muted-foreground">
            {patient.tags && patient.tags.length > 0 ? patient.tags.join(" · ") : "Sem etiquetas"}
          </p>
        </div>
      </header>

      <PatientTabs
        patientId={patient.id}
        workspaceId={patient.workspace_id}
      />
    </div>
  );
}

function PatientTabs({
  patientId,
  workspaceId,
}: {
  patientId: string;
  workspaceId: string;
}) {
  const roleQuery = useQuery({
    queryKey: ["my-workspace-role", workspaceId],
    queryFn: () => getMyWorkspaceRole({ data: { workspaceId } }),
    staleTime: 60_000,
  });
  const isOwner = roleQuery.data?.role === "owner";

  return (
    <Tabs defaultValue="activities" className="w-full">
      <TabsList>
        <TabsTrigger value="activities">Atividades</TabsTrigger>
        <TabsTrigger value="info">Informações</TabsTrigger>
        {isOwner && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
      </TabsList>

      <TabsContent value="activities" className="mt-6">
        <ActivitiesTab patientId={patientId} workspaceId={workspaceId} />
      </TabsContent>

      <TabsContent value="info" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadastro</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Apelido, iniciais e etiquetas. Dados de contato ficam cifrados.
          </CardContent>
        </Card>
      </TabsContent>

      {isOwner && (
        <TabsContent value="audit" className="mt-6">
          <AuditTab patientId={patientId} workspaceId={workspaceId} />
        </TabsContent>
      )}
    </Tabs>
  );
}

// =============================================================================
// Aba Atividades
// =============================================================================

interface ActivitiesTabProps {
  patientId: string;
  workspaceId: string;
}

function ActivitiesTab({ patientId, workspaceId }: ActivitiesTabProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [revealedLink, setRevealedLink] = useState<{
    url: string;
    patientActivityId: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [inSessionTarget, setInSessionTarget] = useState<{
    patientActivityId: string;
    activityTitle: string;
  } | null>(null);
  const [viewResponseId, setViewResponseId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["patient-activities", patientId, workspaceId],
    queryFn: () => listPatientActivities({ data: { patientId, workspaceId } }),
  });

  const activities = listQuery.data?.activities ?? [];
  const activityIds = activities.map((a) => a.id);
  const clinicalFlagsWithLifecycle = useMemo(
    () => computeFlagLifecycle(activities as Array<{
      activity?: { slug?: string; title?: string } | null;
      response?: unknown;
      id: string;
      created_at?: string;
    }>),
    [activities],
  );

  // Only show ACTIVE and MONITORING in the banner (not ACKNOWLEDGED)
  const visibleFlags = clinicalFlagsWithLifecycle.filter(
    (f) => f.lifecycleStatus === "active" || f.lifecycleStatus === "monitoring",
  );

  const shareSummaryQuery = useQuery({
    queryKey: ["activity-share-summary", workspaceId, activityIds.join(",")],
    queryFn: () =>
      getActivityShareSummary({
        data: { workspaceId, patientActivityIds: activityIds },
      }),
    enabled: activityIds.length > 0,
  });
  const shareSummaries = shareSummaryQuery.data?.summaries ?? {};

  const revokeMutation = useMutation({
    mutationFn: (paId: string) =>
      revokeActivity({ data: { patientActivityId: paId } }),
    onSuccess: () => {
      toast.success("Link revogado. Histórico mantido.");
      qc.invalidateQueries({ queryKey: ["patient-activities", patientId] });
      qc.invalidateQueries({ queryKey: ["activity-share-summary", workspaceId] });
      setRevokeTarget(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível revogar.");
    },
  });

  const regenLinkMutation = useMutation({
    mutationFn: (paId: string) =>
      generateInSessionLink({ data: { patientActivityId: paId } }),
    onSuccess: (res, paId) => {
      qc.invalidateQueries({ queryKey: ["patient-activities", patientId] });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setRevealedLink({
        url: `${origin}${res.linkPath}`,
        patientActivityId: paId,
      });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar link.");
    },
  });

  const downloadReport = async () => {
    setReportBusy(true);
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      const res = await generateComplianceReport({
        data: {
          patientId,
          workspaceId,
          from: sixMonthsAgo.toISOString(),
          to: now.toISOString(),
        },
      });
      // Decode base64 to blob and trigger download
      const binary = atob(res.pdf);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório baixado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Atividades aplicadas em sessão e enviadas por link.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport} disabled={reportBusy}>
            <Download className="mr-1 h-4 w-4" />
            {reportBusy ? "Gerando…" : "Compliance Report"}
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Enviar atividade
          </Button>
        </div>
      </div>

      {visibleFlags.length > 0 && (
        <ClinicalFlagBanner
          flags={visibleFlags}
          onViewResponse={(responseId) => setViewResponseId(responseId)}
          patientId={patientId}
          workspaceId={workspaceId}
        />
      )}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma atividade ainda. Envie uma escala (PHQ-9, GAD-7…) ou aplique em sessão.
          </CardContent>
        </Card>
      ) : (
        <>
          <ScoreEvolutionChart activities={activities} />
        <ul className="space-y-3">
          {activities.map((a) => {
            const status = a.status as ActivityStatus;
            const canRevoke =
              status !== "completed" && status !== "revoked" && status !== "expired";
            const canRegenLink =
              status === "pending" || status === "expired";
            const response = Array.isArray(a.response) ? a.response[0] : a.response;
            const flagInfo = getClinicalFlagFromResponse(
              response,
              a.activity?.title ?? "Atividade",
              (a.activity as { slug?: string })?.slug ?? "unknown",
              a.id,
            );
            const hasDraft = a.has_draft && status !== "completed" && status !== "revoked" && status !== "expired";
            const draftPct = a.draft_completion_percent ?? 0;
            const displayStatus: ActivityStatus = hasDraft ? "in_progress" : status;
            const share: ShareSummaryRow | undefined = shareSummaries[a.id];
            return (
              <Card key={a.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {a.activity?.title ?? "Atividade"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("pt-BR")} · modo {a.delivery_mode}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {response?.score != null && (
                        <span className="text-sm">
                          Score <strong>{response.score}</strong>
                          {response.severity && (
                            <span className="text-muted-foreground"> · {response.severity}</span>
                          )}
                        </span>
                      )}
                      {flagInfo && (
                        <button
                          type="button"
                          onClick={() => setViewResponseId(flagInfo.responseId)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-mauve/60 bg-mauve/15 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-mauve/25"
                          aria-label="Abrir resposta com flag clínica"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-mauve" />
                          {formatClinicalFlagLabel(flagInfo.flag)}
                        </button>
                      )}
                      <Badge variant={STATUS_VARIANT[displayStatus]}>
                        {STATUS_LABEL[displayStatus]}
                        {hasDraft && ` · ${draftPct}%`}
                      </Badge>
                      {/* Aplicar agora — in_session pendente */}
                      {(status === "pending" || status === "in_progress") &&
                        (a.delivery_mode === "in_session" || a.delivery_mode === "both") &&
                        !a.used_at && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            setInSessionTarget({
                              patientActivityId: a.id,
                              activityTitle: a.activity?.title ?? "Atividade",
                            })
                          }
                        >
                          <Play className="mr-1 h-3.5 w-3.5" /> Aplicar agora
                        </Button>
                      )}
                      {/* Ver respostas — completa */}
                      {status === "completed" && response?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewResponseId(response.id)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> Ver respostas
                        </Button>
                      )}
                      {canRegenLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={regenLinkMutation.isPending}
                          onClick={() => regenLinkMutation.mutate(a.id)}
                        >
                          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Gerar novo link
                        </Button>
                      )}
                      {canRevoke && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRevokeTarget(a.id)}
                        >
                          <Slash className="mr-1 h-3.5 w-3.5" /> Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                  {hasDraft && (
                    <div className="space-y-1">
                      <Progress value={draftPct} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        Paciente está respondendo. Conteúdo cifrado — você verá só ao finalizar.
                      </p>
                    </div>
                  )}
                  {share && share.total > 0 && (
                    <ShareSummaryLine summary={share} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </ul>
        </>
      )}

      <AssignActivityDialog
        open={open}
        onOpenChange={setOpen}
        patientId={patientId}
        workspaceId={workspaceId}
        onLinkGenerated={(payload) => setRevealedLink(payload)}
      />

      <ShareLinkDialog
        payload={revealedLink}
        patientId={patientId}
        onClose={() => setRevealedLink(null)}
      />

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar este link?</AlertDialogTitle>
            <AlertDialogDescription>
              O link deixa de funcionar imediatamente. O histórico do paciente é preservado.
              Se o paciente já tiver respondido, a resposta permanece.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget)}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* In-session player */}
      {inSessionTarget && (
        <InSessionPlayerDialog
          patientActivityId={inSessionTarget.patientActivityId}
          patientId={patientId}
          workspaceId={workspaceId}
          activityTitle={inSessionTarget.activityTitle}
          onClose={() => setInSessionTarget(null)}
        />
      )}

      {/* Response detail drawer */}
      <ResponseDetailDrawer
        responseId={viewResponseId}
        workspaceId={workspaceId}
        onClose={() => setViewResponseId(null)}
      />
    </div>
  );
}

function ClinicalFlagBanner({
  flags,
  onViewResponse,
}: {
  flags: ClinicalFlagInfo[];
  onViewResponse: (responseId: string) => void;
}) {
  const primary = flags[0];
  const submittedAt = primary.submittedAt
    ? new Date(primary.submittedAt).toLocaleString("pt-BR")
    : "agora";

  return (
    <div className="rounded-lg border-2 border-mauve bg-mauve/15 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mauve/25 text-foreground">
            <AlertTriangle className="h-5 w-5 text-mauve" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Flag clínica detectada · {formatClinicalFlagLabel(primary.flag)}
            </p>
            <p className="max-w-2xl text-sm text-foreground/80">
              {primary.activityTitle} foi respondida em {submittedAt}. Revise a resposta antes de encerrar a revisão clínica.
            </p>
            <p className="text-xs text-muted-foreground">
              Score {primary.score ?? "—"}{primary.severity ? ` · ${primary.severity}` : ""}
              {primary.item_id ? ` · item ${primary.item_id.replace(/^q/i, "")}` : ""}
              {flags.length > 1 ? ` · ${flags.length} flags no histórico` : ""}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-mauve/70 bg-card hover:bg-mauve/10"
          onClick={() => onViewResponse(primary.responseId)}
        >
          <Eye className="mr-1 h-3.5 w-3.5" /> Ver resposta
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Modal "Enviar atividade"
// =============================================================================

interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  workspaceId: string;
  onLinkGenerated: (payload: { url: string; patientActivityId: string }) => void;
}

function AssignActivityDialog({
  open,
  onOpenChange,
  patientId,
  workspaceId,
  onLinkGenerated,
}: AssignDialogProps) {
  const qc = useQueryClient();
  const [activityId, setActivityId] = useState<string>("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("shared_link");
  const [expiresInDays, setExpiresInDays] = useState<number>(7);

  const catalogQuery = useQuery({
    queryKey: ["activity-catalog"],
    queryFn: () => listAvailableActivities(),
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignActivity({
        data: {
          patientId,
          workspaceId,
          activityId,
          deliveryMode,
          expiresInHours: Math.max(1, expiresInDays * 24),
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["patient-activities", patientId] });
      onOpenChange(false);
      setActivityId("");
      setDeliveryMode("shared_link");
      setExpiresInDays(7);
      if (res.rawToken) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        onLinkGenerated({
          url: `${origin}/p/${res.rawToken}`,
          patientActivityId: res.id,
        });
      } else {
        toast.success("Atividade aplicada.");
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar.");
    },
  });

  const catalogActivities = catalogQuery.data?.activities ?? [];
  const needsLink = deliveryMode !== "in_session";
  const canSubmit = !!activityId && !assignMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar atividade</DialogTitle>
          <DialogDescription>
            O paciente pode começar agora e terminar depois. O progresso é salvo com segurança,
            sem login e sem aplicativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Atividade</Label>
            <Select value={activityId} onValueChange={setActivityId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher atividade…" />
              </SelectTrigger>
              <SelectContent>
                {catalogActivities.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modo de aplicação</Label>
            <Select
              value={deliveryMode}
              onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_session">Aplicar em sessão</SelectItem>
                <SelectItem value="shared_link">Enviar por link</SelectItem>
                <SelectItem value="both">Aplicar e enviar link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsLink && (
            <div className="space-y-2">
              <Label htmlFor="expires">Expira em (dias)</Label>
              <Input
                id="expires"
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                O acesso expira; os dados respondidos não.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={() => assignMutation.mutate()}>
            <Send className="mr-1 h-4 w-4" />
            {assignMutation.isPending ? "Enviando…" : "Gerar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Modal "Link gerado" — entrega manual via canal do terapeuta
// (mem://constraint/no-automated-email-policy)
//
// 4 ações: WhatsApp · SMS · Email pessoal · Copiar.
// Telefone/email são decifrados ON-DEMAND via `revealPatientContact`
// só na hora do clique. Nunca persistem em URL nem em audit metadata.
// =============================================================================

interface ShareLinkPayload {
  url: string;
  patientActivityId: string;
}

function ShareLinkDialog({
  payload,
  patientId,
  onClose,
}: {
  payload: ShareLinkPayload | null;
  patientId: string;
  onClose: () => void;
}) {
  const url = payload?.url ?? "";
  const [message, setMessage] = useState(
    "Oi! Aqui está a atividade pra antes da nossa próxima sessão. Leva poucos minutos. Qualquer dúvida me chama.",
  );
  const [busy, setBusy] = useState<null | "whatsapp" | "sms" | "mailto" | "copy">(null);

  // Pré-checa disponibilidade de telefone/email SEM decifrar e SEM auditar.
  // Só roda quando o modal abre. Resposta = só booleans.
  const availabilityQuery = useQuery({
    queryKey: ["patient-contact-availability", patientId],
    queryFn: () => getPatientContactAvailability({ data: { id: patientId } }),
    enabled: !!payload,
    staleTime: 30_000,
  });
  const hasPhone = availabilityQuery.data?.hasPhone ?? false;
  const hasEmail = availabilityQuery.data?.hasEmail ?? false;
  const checking = availabilityQuery.isLoading;

  const composedBody = `${message}\n\n${url}`;

  const logIntent = async (channel: "whatsapp" | "sms" | "mailto" | "copy") => {
    if (!payload) return;
    try {
      await recordShareIntent({
        data: { patientActivityId: payload.patientActivityId, channel },
      });
    } catch {
      // Audit é best-effort; não bloqueia o terapeuta.
    }
  };

  const onCopy = async () => {
    if (!payload) return;
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
      await logIntent("copy");
    } catch {
      toast.error("Não foi possível copiar o link.");
    } finally {
      setBusy(null);
    }
  };

  const openWhatsapp = async () => {
    if (!payload || !hasPhone) return;
    setBusy("whatsapp");
    try {
      let phone = "";
      try {
        const r = await revealPatientContact({
          data: { id: patientId, field: "phone" },
        });
        phone = (r.value ?? "").replace(/\D/g, "");
      } catch {
        // Inconsistência rara: availability disse sim, mas decrypt falhou.
        toast.error("Não foi possível abrir o WhatsApp. Use Copiar link.");
        return;
      }
      const target = `https://wa.me/${phone}?text=${encodeURIComponent(composedBody)}`;
      window.open(target, "_blank", "noopener,noreferrer");
      await logIntent("whatsapp");
    } finally {
      setBusy(null);
    }
  };

  const openSms = async () => {
    if (!payload || !hasPhone) return;
    setBusy("sms");
    try {
      let phone = "";
      try {
        const r = await revealPatientContact({
          data: { id: patientId, field: "phone" },
        });
        phone = r.value ?? "";
      } catch {
        toast.error("Não foi possível abrir o SMS. Use Copiar link.");
        return;
      }
      const target = `sms:${phone}?body=${encodeURIComponent(composedBody)}`;
      window.location.href = target;
      await logIntent("sms");
    } finally {
      setBusy(null);
    }
  };

  const openMailto = async () => {
    if (!payload || !hasEmail) return;
    setBusy("mailto");
    try {
      let email = "";
      try {
        const r = await revealPatientContact({
          data: { id: patientId, field: "email" },
        });
        email = r.value ?? "";
      } catch {
        toast.error("Não foi possível abrir o Email. Use Copiar link.");
        return;
      }
      const subject = encodeURIComponent("Sua atividade");
      const body = encodeURIComponent(composedBody);
      const target = `mailto:${email}?subject=${subject}&body=${body}`;
      window.location.href = target;
      await logIntent("mailto");
    } finally {
      setBusy(null);
    }
  };

  const showFallbackHint = !checking && (!hasPhone || !hasEmail);
  const fallbackParts: string[] = [];
  if (!hasPhone) fallbackParts.push("telefone");
  if (!hasEmail) fallbackParts.push("email");
  const fallbackText =
    fallbackParts.length === 2
      ? "Sem telefone nem email cadastrados — use Copiar link."
      : `Sem ${fallbackParts[0]} cadastrado — use Copiar link como alternativa.`;

  return (
    <Dialog open={!!payload} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link gerado</DialogTitle>
          <DialogDescription>
            Envie pelo seu canal — o que o paciente realmente abre. Este link só
            será exibido <strong>agora</strong> e não poderá ser recuperado depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 break-all font-mono text-xs">
            {url}
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-message">Mensagem sugerida (editável)</Label>
            <Textarea
              id="share-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {showFallbackHint && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {fallbackText}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant="secondary"
              disabled={!!busy || checking || !hasPhone}
              onClick={openWhatsapp}
              title={!hasPhone ? "Sem telefone cadastrado" : undefined}
            >
              <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
            </Button>
            <Button
              variant="secondary"
              disabled={!!busy || checking || !hasPhone}
              onClick={openSms}
              title={!hasPhone ? "Sem telefone cadastrado" : undefined}
            >
              <Smartphone className="mr-1 h-4 w-4" /> SMS
            </Button>
            <Button
              variant="secondary"
              disabled={!!busy || checking || !hasEmail}
              onClick={openMailto}
              title={!hasEmail ? "Sem email cadastrado" : undefined}
            >
              <Mail className="mr-1 h-4 w-4" /> Email
            </Button>
            <Button disabled={!!busy} onClick={onCopy}>
              <Copy className="mr-1 h-4 w-4" /> Copiar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            🔒 Terapily não envia nada ao paciente. Você compartilha pelo seu
            próprio canal — sem <code>noreply@</code> no meio. Cada
            compartilhamento fica em auditoria (canal, sem PHI).
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Aba Auditoria (owner only)
// =============================================================================

const AUDIT_LABEL: Record<string, string> = {
  "activity.assigned": "Atividade enviada",
  "activity.share_intent": "Link compartilhado pelo terapeuta",
  "activity.link_opened": "Link aberto pelo paciente",
  "activity.draft_saved": "Progresso salvo",
  "activity.draft_loaded": "Progresso retomado",
  "activity.draft_discarded": "Rascunho descartado",
  "activity.submitted": "Atividade respondida",
  "activity.status_changed": "Status alterado",
  "activity.response_recorded": "Resposta registrada",
  "activity.revoked": "Atividade revogada",
  "compliance_report.generated": "Compliance Report gerado",
  "patient.contact_revealed": "Contato revelado",
  "clinical_flag.raised": "Flag clínica detectada",
};

function AuditTab({ patientId, workspaceId }: { patientId: string; workspaceId: string }) {
  const auditQuery = useQuery({
    queryKey: ["patient-audit", patientId, workspaceId],
    queryFn: () => listPatientAuditLogs({ data: { patientId, workspaceId, limit: 100 } }),
  });

  if (auditQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando auditoria…</p>;
  }

  const logs = auditQuery.data?.logs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Registros sem dados clínicos. Apenas IDs, ações e horários — visível só pra owner do workspace.
        </p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum evento registrado pra este paciente ainda.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {AUDIT_LABEL[log.action] ?? log.action}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {log.action}
                </p>
              </div>
              <time className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =============================================================================
// ShareSummaryLine — mini-resumo de compartilhamento por canal.
// Renderiza só se houver pelo menos 1 share intent. Sem PHI.
// =============================================================================
function ShareSummaryLine({ summary }: { summary: ShareSummaryRow }) {
  const parts: string[] = [];
  if (summary.byChannel.whatsapp > 0) parts.push(`WhatsApp ${summary.byChannel.whatsapp}`);
  if (summary.byChannel.sms > 0) parts.push(`SMS ${summary.byChannel.sms}`);
  if (summary.byChannel.mailto > 0) parts.push(`Email ${summary.byChannel.mailto}`);
  if (summary.byChannel.copy > 0) parts.push(`Copiar ${summary.byChannel.copy}`);

  const last = summary.lastSharedAt
    ? new Date(summary.lastSharedAt).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <p className="text-xs text-muted-foreground">
      Compartilhada {summary.total}× · {parts.join(" · ")}
      {last && ` · última: ${last}`}
    </p>
  );
}
