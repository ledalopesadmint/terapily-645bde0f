import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  Mail,
  Phone,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/AuthProvider";
import { PatientLimitBanner } from "@/features/patients/PatientLimitBanner";
import { PatientLimitModal } from "@/features/patients/PatientLimitModal";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  patientCreateSchema,
  type PatientCreate,
  type PatientCreateInput,
} from "@/lib/validation/schemas";
import {
  listPatients,
  createPatient,
  updatePatient,
  setPatientLifecycle,
  revealPatientContact,
  getPatientUsage,
  type PatientDTO,
} from "@/features/patients/patients.functions";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => ({
    meta: [
      { title: "Pacientes · Terapily" },
      {
        name: "description",
        content: "Cadastro de pacientes com dados sensíveis criptografados.",
      },
    ],
  }),
  component: PatientsPage,
});

type StatusFilter = "active" | "archived";

const CLIPBOARD_CLEAR_MS = 30_000;

function deriveInitials(displayName: string): string {
  const cleaned = displayName.trim().replace(/[^\p{L}\p{N}]/gu, "");
  return cleaned.slice(0, 2).toUpperCase() || "??";
}

function looksLikeRealName(value: string): boolean {
  const words = value.trim().split(/\s+/).filter((w) => w.length >= 2);
  return words.length >= 3;
}

async function copyAndAutoClear(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`, {
      description: "A área de transferência será limpa em 30s.",
    });
    window.setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === value) await navigator.clipboard.writeText("");
      } catch {
        // Permissão de leitura negada (Firefox, Safari): tudo bem,
        // sobrescrevemos sem checar.
        try {
          await navigator.clipboard.writeText("");
        } catch {
          /* ignore */
        }
      }
    }, CLIPBOARD_CLEAR_MS);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

function PatientsPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<PatientDTO | null>(null);
  const [editing, setEditing] = useState<PatientDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PatientDTO | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const patientsQuery = useQuery({
    queryKey: ["patients", status, search],
    queryFn: () =>
      listPatients({ data: { status, search: search || undefined, limit: 50 } }),
    staleTime: 10_000,
  });

  const usageQuery = useQuery({
    queryKey: ["patients", "usage"],
    queryFn: () => getPatientUsage(),
    staleTime: 10_000,
  });
  const usage = usageQuery.data;

  const lifecycleMutation = useMutation({
    mutationFn: (input: { id: string; action: "archive" | "restore_active" | "soft_delete" }) =>
      setPatientLifecycle({ data: input }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      const labels = {
        archive: "Paciente arquivado.",
        restore_active: "Paciente reativado.",
        soft_delete: "Paciente removido.",
      } as const;
      toast.success(labels[vars.action]);
      setConfirmDelete(null);
      setDetails(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revealMutation = useMutation({
    mutationFn: (input: { id: string; field: "email" | "phone" }) =>
      revealPatientContact({ data: input }),
  });

  const handleCopy = async (
    p: PatientDTO,
    field: "email" | "phone",
    label: string,
  ) => {
    try {
      const { value } = await revealMutation.mutateAsync({ id: p.id, field });
      await copyAndAutoClear(value, label);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const patients = patientsQuery.data?.patients ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Pacientes</Eyebrow>
          <h1 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
            Suas pessoas em acompanhamento.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Cadastro mínimo pra identificar e contatar quem você atende. Nome,
            email e telefone são <strong>criptografados (AES-256)</strong> antes
            de salvar — nem a equipe Terapily lê. Prontuário continua no seu EHR.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" /> Novo paciente
        </Button>
      </header>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="archived">Arquivados</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por apelido"
            className="pl-9"
            aria-label="Buscar paciente por apelido"
          />
        </div>
      </div>

      <section className="mt-6">
        {patientsQuery.isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : patients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="font-display text-2xl text-foreground">
              {status === "active"
                ? "Nenhum paciente ativo ainda."
                : "Nenhum paciente arquivado."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {status === "active"
                ? "Cadastre o primeiro paciente pra começar a usar o acervo."
                : "Pacientes arquivados aparecem aqui pra você restaurar quando precisar."}
            </p>
            {status === "active" && (
              <Button className="mt-6" onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar paciente
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {patients.map((p) => {
              const hasEmail = p.email != null && p.email.length > 0;
              const hasPhone = p.phone != null && p.phone.length > 0;
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/30"
                >
                  <button
                    type="button"
                    onClick={() => setDetails(p)}
                    className="group flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
                    aria-label={`Abrir detalhes de ${p.display_name}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage/20 font-medium text-foreground transition-all group-hover:scale-105 group-hover:bg-sage/30 group-hover:text-sage">
                      {p.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground transition-colors group-hover:text-sage">
                        <span className="story-link">{p.display_name}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.tags.length > 0 ? p.tags.join(" · ") : "Sem etiquetas"}
                      </p>
                    </div>
                  </button>

                  <TooltipProvider delayDuration={150}>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!hasEmail || revealMutation.isPending}
                              onClick={() => handleCopy(p, "email", "Email")}
                              aria-label="Copiar email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {hasEmail ? "Copiar email" : "Sem email cadastrado"}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!hasPhone || revealMutation.isPending}
                              onClick={() => handleCopy(p, "phone", "Telefone")}
                              aria-label="Copiar telefone"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {hasPhone ? "Copiar telefone" : "Sem telefone cadastrado"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PatientDetailsDialog
        patient={details}
        onOpenChange={(o) => !o && setDetails(null)}
        onCopy={handleCopy}
        copying={revealMutation.isPending}
        onEdit={(p) => {
          setDetails(null);
          setEditing(p);
        }}
        onArchive={(p) =>
          lifecycleMutation.mutate({
            id: p.id,
            action: p.status === "active" ? "archive" : "restore_active",
          })
        }
        onAskDelete={(p) => setConfirmDelete(p)}
      />

      <PatientDialog
        open={creating}
        onOpenChange={(o) => !o && setCreating(false)}
        patient={null}
        onSaved={() => {
          setCreating(false);
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }}
      />

      <PatientDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        patient={editing}
        onSaved={() => {
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }}
      />

      <DeleteConfirmDialog
        patient={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={(p) =>
          lifecycleMutation.mutate({ id: p.id, action: "soft_delete" })
        }
        pending={lifecycleMutation.isPending}
      />
    </div>
  );
}

// =============================================================================
// Detalhes do paciente (popup com ações destrutivas)
// =============================================================================
interface DetailsProps {
  patient: PatientDTO | null;
  onOpenChange: (open: boolean) => void;
  onCopy: (p: PatientDTO, field: "email" | "phone", label: string) => void;
  copying: boolean;
  onEdit: (p: PatientDTO) => void;
  onArchive: (p: PatientDTO) => void;
  onAskDelete: (p: PatientDTO) => void;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}

function PatientDetailsDialog({
  patient,
  onOpenChange,
  onCopy,
  copying,
  onEdit,
  onArchive,
  onAskDelete,
}: DetailsProps) {
  if (!patient) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }
  const p = patient;
  const hasEmail = p.email != null && p.email.length > 0;
  const hasPhone = p.phone != null && p.phone.length > 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {p.display_name}
          </DialogTitle>
          <DialogDescription>
            {p.tags.length > 0 ? p.tags.join(" · ") : "Sem etiquetas"} ·{" "}
            {p.status === "active" ? "Ativo" : "Arquivado"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {p.full_name && (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Nome completo (cifrado)
              </p>
              <p className="mt-1 text-sm text-foreground">{p.full_name}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <p className="mt-1 truncate text-sm text-foreground">
                {hasEmail ? maskEmail(p.email!) : "—"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={!hasEmail || copying}
                onClick={() => onCopy(p, "email", "Email")}
              >
                <Mail className="mr-2 h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Telefone
              </p>
              <p className="mt-1 truncate text-sm text-foreground">
                {hasPhone ? maskPhone(p.phone!) : "—"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={!hasPhone || copying}
                onClick={() => onCopy(p, "phone", "Telefone")}
              >
                <Phone className="mr-2 h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            🔒 Email e telefone ficam cifrados (AES-256) no banco. Cada cópia é
            registrada em auditoria. A área de transferência se limpa em 30s.
          </p>
        </div>

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => onEdit(p)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onArchive(p)}>
              {p.status === "active" ? (
                <>
                  <Archive className="mr-2 h-4 w-4" /> Arquivar
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" /> Reativar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onAskDelete(p)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Confirmação de exclusão (digite EXCLUIR {apelido})
// =============================================================================
interface DeleteConfirmProps {
  patient: PatientDTO | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (p: PatientDTO) => void;
  pending: boolean;
}

function DeleteConfirmDialog({
  patient,
  onOpenChange,
  onConfirm,
  pending,
}: DeleteConfirmProps) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!patient) setTyped("");
  }, [patient]);

  if (!patient) {
    return (
      <AlertDialog open={false} onOpenChange={onOpenChange}>
        <AlertDialogContent />
      </AlertDialog>
    );
  }

  const expected = `EXCLUIR ${patient.display_name}`;
  const matches = typed.trim() === expected;

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este paciente?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                O paciente sai da sua lista imediatamente. O registro continua
                preservado no banco (cifrado) pra auditoria, conforme a retenção
                exigida pela HIPAA — não conseguimos recuperar pela interface
                depois de excluir.
              </p>
              <p>
                Pra confirmar, digite{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                  {expected}
                </code>{" "}
                abaixo.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={expected}
          autoComplete="off"
          aria-label="Confirmação de exclusão"
        />

        <AlertDialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={() => onConfirm(patient)}
          >
            {pending ? "Excluindo…" : "Excluir paciente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =============================================================================
// Diálogo de criação / edição
// =============================================================================
interface PatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDTO | null;
  onSaved: () => void;
}

function PatientDialog({ open, onOpenChange, patient, onSaved }: PatientDialogProps) {
  const isEdit = patient !== null;

  const form = useForm<PatientCreateInput>({
    resolver: zodResolver(patientCreateSchema) as never,
    values: {
      display_name: patient?.display_name ?? "",
      initials: patient?.initials ?? "",
      tags: patient?.tags ?? [],
      assigned_therapist_id: patient?.assigned_therapist_id,
      full_name: patient?.full_name ?? "",
      email: patient?.email ?? "",
      phone: patient?.phone ?? "",
    },
  });

  const createMut = useMutation({
    mutationFn: (data: PatientCreate) => createPatient({ data }),
    onSuccess: () => {
      toast.success("Paciente cadastrado.");
      form.reset();
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMut = useMutation({
    mutationFn: (data: PatientCreate) => {
      if (!patient) throw new Error("Sem paciente em edição.");
      return updatePatient({ data: { ...data, id: patient.id } });
    },
    onSuccess: () => {
      toast.success("Alterações salvas.");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitting = createMut.isPending || updateMut.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const parsed = patientCreateSchema.parse({
      ...values,
      initials: values.initials?.trim() || deriveInitials(values.display_name),
    });
    if (isEdit) updateMut.mutate(parsed);
    else createMut.mutate(parsed);
  });

  const tagsValue = (form.watch("tags") ?? []).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar paciente" : "Novo paciente"}</DialogTitle>
          <DialogDescription>
            Cadastro mínimo: só o que você usa pra identificar e entrar em
            contato. Prontuário fica no seu EHR.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="display_name">Apelido (não-sensível)</Label>
              <Input
                id="display_name"
                {...form.register("display_name")}
                placeholder='Ex: "Ana M.", "Paciente 12"'
                autoComplete="off"
                aria-describedby="display_name_help"
              />
              <p id="display_name_help" className="mt-1 text-xs text-muted-foreground">
                Aparece em listas, buscas e logs. Não use nome completo, email
                ou telefone.
              </p>
              {form.formState.errors.display_name && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.display_name.message}
                </p>
              )}
              {!form.formState.errors.display_name &&
                looksLikeRealName(form.watch("display_name") ?? "") && (
                  <p className="mt-1 text-xs text-mauve">
                    Parece um nome completo. Considere usar só primeiro nome +
                    inicial (ex: "Ana M.") — o nome real vai no campo
                    criptografado abaixo.
                  </p>
                )}
            </div>
            <div>
              <Label htmlFor="initials">Iniciais</Label>
              <Input
                id="initials"
                {...form.register("initials")}
                placeholder="AM"
                maxLength={6}
                autoComplete="off"
              />
              {form.formState.errors.initials && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.initials.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Etiquetas (separadas por vírgula)</Label>
            <Input
              id="tags"
              defaultValue={tagsValue}
              onChange={(e) =>
                form.setValue(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 10),
                )
              }
              placeholder="ansiedade, adolescente"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dados de contato
              </p>
              <p className="text-[11px] text-muted-foreground">
                🔒 Criptografados (AES-256) antes de salvar.
              </p>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  {...form.register("full_name")}
                  autoComplete="off"
                  aria-describedby="full_name_help"
                />
                <p id="full_name_help" className="mt-1 text-xs text-muted-foreground">
                  Aparece em relatórios e PDFs que você exporta pro EHR.
                </p>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  autoComplete="off"
                  aria-describedby="email_help"
                />
                <p id="email_help" className="mt-1 text-xs text-muted-foreground">
                  Usado pra enviar atividades por magic link (sem login).
                </p>
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  autoComplete="off"
                  aria-describedby="phone_help"
                />
                <p id="phone_help" className="mt-1 text-xs text-muted-foreground">
                  Contato rápido fora da sessão. Não é enviado nada automaticamente.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : isEdit ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
