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

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { z } from "zod";
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
import {
  generateScaleResultPatient,
  generateScaleResultTherapist,
} from "@/features/activities/scale-result-pdf.functions";
import {
  generateWorksheetResultPatient,
  generateWorksheetResultTherapist,
} from "@/features/activities/worksheet-result-pdf.functions";
import { ScoreEvolutionChart } from "@/features/activities/components/ScoreEvolutionChart";
import { InSessionPlayerDialog } from "@/features/activities/components/InSessionPlayerDialog";
import { ResponseDetailDrawer } from "@/features/activities/components/ResponseDetailDrawer";
import { Progress } from "@/components/ui/progress";

const patientSearchSchema = z.object({
  startSession: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/patients/$id")({
  validateSearch: patientSearchSchema,
  head: () => ({
    meta: [
      { title: "Paciente · Terapily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PatientDetailPage,
});

type DeliveryMode = "in_session" | "shared_link" | "both";

/**
 * Returns the public-facing origin for magic links.
 * Magic links MUST point to the published site, never the preview/editor URL,
 * because the preview goes through Lovable's auth bridge which confuses patients.
 */
function getPublicOrigin(): string {
  if (typeof window === "undefined") return "";
  const { origin, hostname } = window.location;
  // Custom domain → use as-is
  if (hostname === "www.terapily.com" || hostname === "terapily.com") return origin;
  // Published lovable.app → use as-is
  if (hostname === "mvp-guardian-ai.lovable.app") return origin;
  // Stable published URL
  if (hostname.endsWith(".lovable.app") && !hostname.includes("-preview")) return origin;
  // Preview/editor → redirect to the stable published URL
  return "https://www.terapily.com";
}

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

function formatClinicalFlagLabel(flag: unknown): string {
  if (typeof flag !== "string") return "Sinal clínico detectado";
  if (flag === "suicidal_ideation") return "Ideação suicida";
  if (flag === "self_harm") return "Autolesão";
  if (flag === "homicidal_ideation") return "Ideação homicida";
  if (flag === "substance_abuse") return "Uso de substâncias";
  return flag.replace(/_/g, " ");
}

function PatientDetailPage() {
  const { id } = useParams({ from: "/_authenticated/patients/$id" });
  const { startSession } = Route.useSearch();

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
        startSession={startSession}
      />
    </div>
  );
}

function PatientTabs({
  patientId,
  workspaceId,
  startSession,
}: {
  patientId: string;
  workspaceId: string;
  startSession?: string;
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
        {isOwner && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
      </TabsList>

      <TabsContent value="activities" className="mt-6">
        <ActivitiesTab patientId={patientId} workspaceId={workspaceId} startSession={startSession} />
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
  startSession?: string;
}

function ActivitiesTab({ patientId, workspaceId, startSession }: ActivitiesTabProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [revealedLink, setRevealedLink] = useState<{
    url: string;
    patientActivityId: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [scaleResultBusy, setScaleResultBusy] = useState<string | null>(null);
  const [inSessionTarget, setInSessionTarget] = useState<{
    patientActivityId: string;
    activityTitle: string;
  } | null>(null);
  const [viewResponseId, setViewResponseId] = useState<string | null>(null);

  const [startSessionConsumed, setStartSessionConsumed] = useState(false);

  const downloadScaleResult = async (
    responseId: string,
    variant: "patient" | "therapist",
    archetype?: string,
  ) => {
    setScaleResultBusy(`${responseId}-${variant}`);
    try {
      const isWorksheet = archetype === "structured_form";
      const fn = isWorksheet
        ? (variant === "patient" ? generateWorksheetResultPatient : generateWorksheetResultTherapist)
        : (variant === "patient" ? generateScaleResultPatient : generateScaleResultTherapist);
      const res = await fn({ data: { activityResponseId: responseId, workspaceId } });
      const binary = atob(res.pdf);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = variant === "patient" ? "patient" : "therapist";
      a.download = `activity-result-${suffix}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório baixado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    } finally {
      setScaleResultBusy(null);
    }
  };

  const listQuery = useQuery({
    queryKey: ["patient-activities", patientId, workspaceId],
    queryFn: () => listPatientActivities({ data: { patientId, workspaceId } }),
  });

  const activities = listQuery.data?.activities ?? [];
  const activityIds = activities.map((a) => a.id);

  // Auto-open in-session player when navigated from Acervo with startSession param
  useEffect(() => {
    if (!startSession || startSessionConsumed) return;
    if (!listQuery.data) return;
    const match = activities.find((a) => a.id === startSession);
    if (match && (match as { status?: string }).status !== "revoked") {
      setInSessionTarget({
        patientActivityId: startSession,
        activityTitle: (match as { activity?: { title?: string } }).activity?.title ?? "Atividade",
      });
    }
    setStartSessionConsumed(true);
  }, [startSession, startSessionConsumed, listQuery.data, activities]);

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
      revokeActivity({ data: { patientActivityId: paId, reason: revokeReason.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Link revogado. Histórico mantido.");
      qc.invalidateQueries({ queryKey: ["patient-activities", patientId] });
      qc.invalidateQueries({ queryKey: ["activity-share-summary", workspaceId] });
      setRevokeTarget(null);
      setRevokeReason("");
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
      const origin = getPublicOrigin();
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground hidden sm:block">
          Atividades aplicadas em sessão e enviadas por link.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <Button
            variant="outline"
            onClick={downloadReport}
            disabled={reportBusy}
            className="text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10"
          >
            <Download className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{reportBusy ? "Gerando…" : "Compliance Report"}</span>
          </Button>
          <Button
            onClick={() => setOpen(true)}
            className="text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10"
          >
            <Plus className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Enviar atividade</span>
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
              <Card key={a.id} className="overflow-hidden">
                <CardContent className="py-4 px-3 sm:px-6">
                  {/* ===== MOBILE LAYOUT (< sm) ===== */}
                  <div className="flex flex-col gap-2.5 sm:hidden">
                    {/* M-Linha 1: Título + Flag */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground text-sm leading-snug">
                        {a.activity?.title ?? "Atividade"}
                      </p>
                      {flagInfo && (
                        <button
                          type="button"
                          onClick={() => setViewResponseId(flagInfo.responseId)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-action-flag bg-action-flag-subtle px-2 py-0.5 text-[10px] font-bold text-action-flag shadow-sm shadow-action-flag/20 transition-all duration-150 hover:scale-105 active:scale-95"
                          aria-label="Abrir resposta com flag clínica"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {formatClinicalFlagLabel(flagInfo.flag)}
                        </button>
                      )}
                    </div>
                    {/* M-Linha 2: Data, horário, modo */}
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {new Date(a.created_at).toLocaleString("pt-BR")} · modo {a.delivery_mode}
                    </p>
                    {/* M-Linha 3: Score + classificação (ou revocation reason) */}
                    {(status === "revoked" && a.revocation_reason) ? (
                      <p className="truncate text-xs text-muted-foreground italic" title={a.revocation_reason}>
                        {a.revocation_reason}
                      </p>
                    ) : response?.score != null ? (
                      <span className="text-xs">
                        Score <strong>{response.score}</strong>
                        {response.severity && (
                          <span className="text-muted-foreground"> · {response.severity}</span>
                        )}
                      </span>
                    ) : null}
                    {/* M-Linha 4: Status + Ver respostas + Aplicar + Revogar/Novo link */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_VARIANT[displayStatus]} className="text-[10px] px-1.5 py-0.5">
                        {STATUS_LABEL[displayStatus]}
                        {hasDraft && ` · ${draftPct}%`}
                      </Badge>
                      {(status === "pending" || status === "in_progress") &&
                        (a.delivery_mode === "in_session" || a.delivery_mode === "both") &&
                        !a.used_at && (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-[10px] h-6 px-2"
                          onClick={() =>
                            setInSessionTarget({
                              patientActivityId: a.id,
                              activityTitle: a.activity?.title ?? "Atividade",
                            })
                          }
                        >
                          <Play className="mr-0.5 h-2.5 w-2.5" /> Aplicar
                        </Button>
                      )}
                      {status === "completed" && response?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewResponseId(response.id)}
                          className="text-[10px] h-6 px-2"
                        >
                          <Eye className="mr-0.5 h-2.5 w-2.5" /> Ver
                        </Button>
                      )}
                      {canRegenLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={regenLinkMutation.isPending}
                          onClick={() => regenLinkMutation.mutate(a.id)}
                          className="text-[10px] h-6 px-2"
                        >
                          <RefreshCw className="mr-0.5 h-2.5 w-2.5" /> Novo link
                        </Button>
                      )}
                      {canRevoke && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRevokeTarget(a.id)}
                          className="text-[10px] h-6 px-2"
                        >
                          <Slash className="mr-0.5 h-2.5 w-2.5" /> Revogar
                        </Button>
                      )}
                    </div>
                    {/* M-Linha 5: Botões Paciente + Terapeuta (só se completed) */}
                    {status === "completed" && response?.id && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          className="text-[10px] h-7 px-2 border border-action-patient-report bg-action-patient-report text-action-patient-report-fg shadow-sm transition-all duration-150 hover:scale-105 active:scale-95"
                          disabled={scaleResultBusy === `${response.id}-patient`}
                          onClick={() => downloadScaleResult(response.id, "patient", (a.activity as any)?.archetype)}
                        >
                          <Download className="mr-0.5 h-2.5 w-2.5" />
                          {scaleResultBusy === `${response.id}-patient` ? "…" : "Paciente"}
                        </Button>
                        <Button
                          size="sm"
                          className="text-[10px] h-7 px-2 border border-action-therapist-report bg-action-therapist-report text-action-therapist-report-fg shadow-sm transition-all duration-150 hover:scale-105 active:scale-95"
                          disabled={scaleResultBusy === `${response.id}-therapist`}
                          onClick={() => downloadScaleResult(response.id, "therapist", (a.activity as any)?.archetype)}
                        >
                          <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
                          {scaleResultBusy === `${response.id}-therapist` ? "…" : "Terapeuta"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ===== DESKTOP LAYOUT (>= sm) ===== */}
                  <div className="hidden sm:block space-y-2">
                    {/* Linha 1: Nome do teste + Flag */}
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">
                        {a.activity?.title ?? "Atividade"}
                      </p>
                      {flagInfo && (
                        <button
                          type="button"
                          onClick={() => setViewResponseId(flagInfo.responseId)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-action-flag bg-action-flag-subtle px-2.5 py-1 text-xs font-bold text-action-flag shadow-sm shadow-action-flag/20 transition-all duration-150 hover:scale-105 hover:shadow-md hover:shadow-action-flag/30 hover:brightness-110 active:scale-95"
                          aria-label="Abrir resposta com flag clínica"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {formatClinicalFlagLabel(flagInfo.flag)}
                        </button>
                      )}
                    </div>
                    {/* Linha 2: Data, horário, modo */}
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")} · modo {a.delivery_mode}
                    </p>
                    {/* Linha 3: Score/revocation */}
                    {(status === "revoked" && a.revocation_reason) ? (
                      <p className="truncate text-xs text-muted-foreground italic" title={a.revocation_reason}>
                        {a.revocation_reason}
                      </p>
                    ) : response?.score != null ? (
                      <span className="text-sm">
                        Score <strong>{response.score}</strong>
                        {response.severity && (
                          <span className="text-muted-foreground"> · {response.severity}</span>
                        )}
                      </span>
                    ) : null}
                    {/* Ações desktop */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[displayStatus]}>
                        {STATUS_LABEL[displayStatus]}
                        {hasDraft && ` · ${draftPct}%`}
                      </Badge>
                      {(status === "pending" || status === "in_progress") &&
                        (a.delivery_mode === "in_session" || a.delivery_mode === "both") &&
                        !a.used_at && (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs px-3"
                          onClick={() =>
                            setInSessionTarget({
                              patientActivityId: a.id,
                              activityTitle: a.activity?.title ?? "Atividade",
                            })
                          }
                        >
                          <Play className="mr-1 h-3.5 w-3.5" /> Aplicar
                        </Button>
                      )}
                      {status === "completed" && response?.id && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewResponseId(response.id)}
                            className="text-xs px-3"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs px-3 border border-action-patient-report bg-action-patient-report text-action-patient-report-fg shadow-sm transition-all duration-150 hover:scale-105 hover:bg-action-patient-report hover:text-action-patient-report-fg hover:shadow-md hover:shadow-action-patient-report/30 hover:brightness-110 active:scale-95"
                            disabled={scaleResultBusy === `${response.id}-patient`}
                            onClick={() => downloadScaleResult(response.id, "patient", (a.activity as any)?.archetype)}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            {scaleResultBusy === `${response.id}-patient` ? "…" : "Paciente"}
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs px-3 border border-action-therapist-report bg-action-therapist-report text-action-therapist-report-fg shadow-sm transition-all duration-150 hover:scale-105 hover:bg-action-therapist-report hover:text-action-therapist-report-fg hover:shadow-md hover:shadow-action-therapist-report/30 hover:brightness-110 active:scale-95"
                            disabled={scaleResultBusy === `${response.id}-therapist`}
                            onClick={() => downloadScaleResult(response.id, "therapist", (a.activity as any)?.archetype)}
                          >
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            {scaleResultBusy === `${response.id}-therapist` ? "…" : "Terapeuta"}
                          </Button>
                        </>
                      )}
                      {canRegenLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={regenLinkMutation.isPending}
                          onClick={() => regenLinkMutation.mutate(a.id)}
                          className="text-xs px-3"
                        >
                          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Novo link
                        </Button>
                      )}
                      {canRevoke && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRevokeTarget(a.id)}
                          className="text-xs px-3"
                        >
                          <Slash className="mr-1 h-3.5 w-3.5" /> Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                  {(hasDraft || displayStatus === "in_progress") && (
                    <div className="space-y-1">
                      <Progress value={hasDraft ? draftPct : 5} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {hasDraft
                          ? `Paciente está respondendo (${draftPct}%). Conteúdo cifrado — você verá só ao finalizar.`
                          : "Paciente iniciou a atividade. Conteúdo cifrado — você verá só ao finalizar."}
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
        onOpenChange={(o) => {
          if (!o) {
            setRevokeTarget(null);
            setRevokeReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar este link?</AlertDialogTitle>
            <AlertDialogDescription>
              O link deixa de funcionar imediatamente. O histórico do paciente é preservado.
              Se o paciente já tiver respondido, a resposta permanece.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label htmlFor="revoke-reason" className="text-sm font-medium text-foreground">
              Observação <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              id="revoke-reason"
              type="text"
              maxLength={200}
              placeholder="Ex: Link gerado por engano, paciente errado…"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/40"
            />
          </div>
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
  patientId,
  workspaceId,
}: {
  flags: ClinicalFlagWithLifecycle[];
  onViewResponse: (responseId: string) => void;
  patientId: string;
  workspaceId: string;
}) {
  const qc = useQueryClient();
  const [showGuidance, setShowGuidance] = useState(false);

  const acknowledgeMutation = useMutation({
    mutationFn: (responseId: string) =>
      acknowledgeClinicalFlag({ data: { responseId, workspaceId } }),
    onSuccess: () => {
      toast.success("Flag reconhecida. Registrado na auditoria.");
      qc.invalidateQueries({ queryKey: ["patient-activities", patientId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao reconhecer flag.");
    },
  });

  const activeFlags = flags.filter((f) => f.lifecycleStatus === "active");
  const monitoringFlags = flags.filter((f) => f.lifecycleStatus === "monitoring");

  return (
    <div className="space-y-3">
      {/* ACTIVE flags — Mauve */}
      {activeFlags.map((flag) => {
        const submittedAt = flag.submittedAt
          ? new Date(flag.submittedAt).toLocaleString("pt-BR")
          : "agora";
        return (
          <div key={flag.responseId} className="rounded-lg border-2 border-mauve bg-mauve/15 p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-action-flag/15 text-action-flag">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      ⚠ Risco ativo · {formatClinicalFlagLabel(flag.flag)}
                    </p>
                    <Badge variant="destructive" className="border-action-flag bg-action-flag text-action-flag-fg text-xs">ATIVO</Badge>
                  </div>
                  <p className="max-w-2xl text-sm text-foreground/80">
                    {flag.activityTitle} respondida em {submittedAt}. O sinal de risco persiste na aplicação mais recente desta escala.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score {flag.score ?? "—"}{flag.severity ? ` · ${flag.severity}` : ""}
                    {flag.item_id ? ` · item ${typeof flag.item_id === "string" ? flag.item_id.replace(/^q/i, "") : flag.item_id}` : ""}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-action-flag/40 bg-card hover:bg-action-flag/10 hover:text-action-flag"
                onClick={() => onViewResponse(flag.responseId)}
              >
                <Eye className="mr-1 h-3.5 w-3.5" /> Ver resposta
              </Button>
            </div>
          </div>
        );
      })}

      {/* MONITORING flags — Amber/Gold */}
      {monitoringFlags.map((flag) => {
        const submittedAt = flag.submittedAt
          ? new Date(flag.submittedAt).toLocaleString("pt-BR")
          : "—";
        const resolvedAt = flag.resolvedAt
          ? new Date(flag.resolvedAt).toLocaleString("pt-BR")
          : "recentemente";
        return (
          <div key={flag.responseId} className="rounded-lg border-2 border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/15 p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-foreground">
                  <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      👁 Em monitoramento · {formatClinicalFlagLabel(flag.flag)}
                    </p>
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-300">MONITORAMENTO</Badge>
                  </div>
                  <p className="max-w-2xl text-sm text-foreground/80">
                    Flag anterior (detectada em {submittedAt}) não foi disparada na aplicação mais recente ({resolvedAt}). Monitoramento recomendado.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score original {flag.score ?? "—"}{flag.severity ? ` · ${flag.severity}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400/70 bg-card hover:bg-amber-50"
                  onClick={() => onViewResponse(flag.responseId)}
                >
                  <Eye className="mr-1 h-3.5 w-3.5" /> Ver resposta
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-sage hover:bg-sage/90 text-white"
                  disabled={acknowledgeMutation.isPending}
                  onClick={() => acknowledgeMutation.mutate(flag.responseId)}
                >
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Reconhecer
                </Button>
              </div>
            </div>

            {/* Collapsible US legal guidance */}
            <div className="mt-3 border-t border-amber-200/60 dark:border-amber-800/40 pt-3">
              <button
                type="button"
                className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
                onClick={() => setShowGuidance(!showGuidance)}
              >
                {showGuidance ? "▾ Ocultar orientações" : "▸ Orientações clínicas (EUA)"}
              </button>
              {showGuidance && (
                <div className="mt-2 rounded-md bg-amber-50/60 dark:bg-amber-900/20 p-3 text-xs text-foreground/80 space-y-2">
                  <p><strong>Tarasoff v. Regents (1976):</strong> Duty to warn/protect applies when a patient poses a serious threat of violence to an identifiable third party. Most US states have adopted some version of this duty.</p>
                  <p><strong>Mandatory reporting:</strong> All 50 states require reporting suspected child abuse/neglect. Many states extend to elder/dependent adult abuse.</p>
                  <p><strong>Suicide risk:</strong> No federal duty-to-warn for self-harm, but standard of care requires documented safety planning, risk assessment, and appropriate follow-up.</p>
                  <p><strong>Documentation:</strong> Record the clinical reasoning behind your risk assessment, the interventions applied, and any referrals made. Terapily's audit trail captures flag detection and resolution timestamps automatically.</p>
                  <p><strong>Consult your licensing board</strong> for jurisdiction-specific obligations.</p>
                  <p className="italic text-muted-foreground mt-2">This information is for reference only and does not constitute legal advice. Consult a qualified attorney or your licensing board for jurisdiction-specific requirements.</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
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
        const origin = getPublicOrigin();
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
      // Always copy message + link so the recipient gets context, not just a bare URL
      await navigator.clipboard.writeText(composedBody);
      toast.success("Mensagem e link copiados.");
      await logIntent("copy");
    } catch {
      toast.error("Não foi possível copiar.");
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
  "clinical_flag.resolved": "Flag clínica resolvida",
  "clinical_flag.acknowledged": "Flag clínica reconhecida",
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
