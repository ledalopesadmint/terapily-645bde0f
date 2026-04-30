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
import { ArrowLeft, Copy, Mail, MessageCircle, Plus, Send, ShieldCheck, Slash, Smartphone } from "lucide-react";
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

import { getPatient, revealPatientContact } from "@/features/patients/patients.functions";
import {
  assignActivity,
  getMyWorkspaceRole,
  listPatientActivities,
  listPatientAuditLogs,
  recordShareIntent,
  revokeActivity,
  listAvailableActivities,
} from "@/features/activities/activities.functions";
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

  const listQuery = useQuery({
    queryKey: ["patient-activities", patientId, workspaceId],
    queryFn: () => listPatientActivities({ data: { patientId, workspaceId } }),
  });

  const revokeMutation = useMutation({
    mutationFn: (paId: string) =>
      revokeActivity({ data: { patientActivityId: paId } }),
    onSuccess: () => {
      toast.success("Link revogado. Histórico mantido.");
      qc.invalidateQueries({ queryKey: ["patient-activities", patientId] });
      setRevokeTarget(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível revogar.");
    },
  });

  const activities = listQuery.data?.activities ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Atividades aplicadas em sessão e enviadas por link.
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Enviar atividade
        </Button>
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma atividade ainda. Envie uma escala (PHQ-9, GAD-7…) ou aplique em sessão.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {activities.map((a) => {
            const status = a.status as ActivityStatus;
            const canRevoke =
              status !== "completed" && status !== "revoked" && status !== "expired";
            const response = Array.isArray(a.response) ? a.response[0] : a.response;
            const hasDraft = a.has_draft && status !== "completed" && status !== "revoked" && status !== "expired";
            const draftPct = a.draft_completion_percent ?? 0;
            const displayStatus: ActivityStatus = hasDraft ? "in_progress" : status;
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
                    <div className="flex items-center gap-3">
                      {response?.score != null && (
                        <span className="text-sm">
                          Score <strong>{response.score}</strong>
                          {response.severity && (
                            <span className="text-muted-foreground"> · {response.severity}</span>
                          )}
                        </span>
                      )}
                      <Badge variant={STATUS_VARIANT[displayStatus]}>
                        {STATUS_LABEL[displayStatus]}
                        {hasDraft && ` · ${draftPct}%`}
                      </Badge>
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
                </CardContent>
              </Card>
            );
          })}
        </ul>
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

  const activities = catalogQuery.data?.activities ?? [];
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
                {activities.map((a) => (
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
// Modal "Link gerado" — mostra UMA vez
// =============================================================================

function RevealLinkDialog({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  };

  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link gerado</DialogTitle>
          <DialogDescription>
            Compartilhe este link diretamente com o paciente. Por segurança, ele
            só será exibido <strong>uma vez</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/30 p-3 break-all font-mono text-xs">
          {url}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={copy}>
            <Copy className="mr-1 h-4 w-4" /> Copiar link
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
  "activity.link_opened": "Link aberto pelo paciente",
  "activity.draft_saved": "Progresso salvo",
  "activity.draft_loaded": "Progresso retomado",
  "activity.draft_discarded": "Rascunho descartado",
  "activity.submitted": "Atividade respondida",
  "activity.status_changed": "Status alterado",
  "activity.response_recorded": "Resposta registrada",
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
