import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Archive, ArchiveRestore, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

function deriveInitials(displayName: string): string {
  // Apelido é pseudônimo curto — pegamos só os 2 primeiros caracteres
  // alfabéticos. Não tentamos extrair "iniciais de nome" porque o campo
  // não deve conter nome real.
  const cleaned = displayName.trim().replace(/[^\p{L}\p{N}]/gu, "");
  return cleaned.slice(0, 2).toUpperCase() || "??";
}

// Heurística leve: nome composto longo (3+ palavras com 2+ letras) tem cara
// de "Primeiro Meio Sobrenome" — avisamos sem bloquear.
function looksLikeRealName(value: string): boolean {
  const words = value.trim().split(/\s+/).filter((w) => w.length >= 2);
  return words.length >= 3;
}

function PatientsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PatientDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PatientDTO | null>(null);

  const patientsQuery = useQuery({
    queryKey: ["patients", status, search],
    queryFn: () =>
      listPatients({ data: { status, search: search || undefined, limit: 50 } }),
    staleTime: 10_000,
  });

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
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
            Use um <strong>apelido curto</strong> (ex: "Ana M.", "Paciente 12")
            pra identificar visualmente. Nome completo, contato e observações
            são criptografados antes de gravar.
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
            {patients.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/30"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage/20 font-medium text-foreground">
                  {p.initials}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium text-foreground">
                    {p.display_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.tags.length > 0 ? p.tags.join(" · ") : "Sem etiquetas"}
                  </p>
                </button>

                <TooltipProvider delayDuration={150}>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(p)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>

                    {p.status === "active" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              lifecycleMutation.mutate({ id: p.id, action: "archive" })
                            }
                            aria-label="Arquivar"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Arquivar</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              lifecycleMutation.mutate({
                                id: p.id,
                                action: "restore_active",
                              })
                            }
                            aria-label="Reativar"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reativar</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(p)}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remover</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              O paciente sai da sua lista. O registro fica preservado pra
              auditoria, conforme retenção do plano. Você pode reativar mais
              tarde se foi engano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  lifecycleMutation.mutate({
                    id: confirmDelete.id,
                    action: "soft_delete",
                  });
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
      date_of_birth: patient?.date_of_birth ?? "",
      intake_notes: patient?.intake_notes ?? "",
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
            <strong>Apelido</strong> é só um identificador curto não-sensível —
            evite digitar o nome real aqui. Os campos abaixo (nome completo,
            contato, observações) são criptografados antes de gravar.
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dados sensíveis · criptografados
            </p>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" {...form.register("full_name")} autoComplete="off" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...form.register("phone")} autoComplete="off" />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Nascimento</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...form.register("date_of_birth")}
                  autoComplete="off"
                />
                {form.formState.errors.date_of_birth && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.date_of_birth.message as string}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="intake_notes">Observações iniciais</Label>
                <Textarea
                  id="intake_notes"
                  rows={4}
                  {...form.register("intake_notes")}
                  placeholder="Histórico clínico, queixa principal, contexto."
                />
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
