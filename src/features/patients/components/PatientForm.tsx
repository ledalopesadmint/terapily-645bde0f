/**
 * Form de criar/editar paciente. PHI (full_name, email, phone) é enviado
 * em texto plano via HTTPS pro server function — que cifra com AES-GCM-256
 * antes de gravar. Nunca loga valores no client.
 */
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  patientCreateSchema,
  type PatientCreate,
  type PatientCreateInput,
} from "@/lib/validation/schemas";
import {
  createPatient,
  updatePatient,
} from "@/features/patients/patients.functions";
import {
  isLimitReachedError,
  parseLimitReachedError,
  type LimitReachedInfo,
  type PatientDTO,
} from "../patients.types";
import { deriveInitials, looksLikeRealName } from "./utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDTO | null;
  onSaved: () => void;
  /**
   * Disparado quando o servidor recusa por limite (`__LIMIT_REACHED__`).
   * Recebe `tier` e `max` autoritativos vindos do servidor — a UI deve usar
   * esses valores no modal, não os de `getPatientUsage` (que pode estar
   * desatualizado, em loading, ou ter falhado).
   */
  onLimitReached?: (info: LimitReachedInfo) => void;
}

export function PatientForm({
  open,
  onOpenChange,
  patient,
  onSaved,
  onLimitReached,
}: Props) {
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
    onError: (err: Error) => {
      // Marker estruturado vindo do servidor: abre o modal de limite
      // contextual ao invés de toast genérico. NUNCA mostra a string crua
      // `__LIMIT_REACHED__:...` ao usuário.
      if (isLimitReachedError(err)) {
        const info = parseLimitReachedError(err);
        if (info && onLimitReached) {
          onLimitReached(info);
          return;
        }
        // Fallback defensivo: se por algum motivo não conseguimos parsear
        // ou o pai não passou o callback, mostra mensagem amigável genérica
        // — nunca o marker técnico.
        toast.error("Você atingiu o limite de pacientes do seu plano.");
        return;
      }
      toast.error(err.message);
    },
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
          <DialogTitle>
            {isEdit ? "Editar paciente" : "Novo paciente"}
          </DialogTitle>
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
              <p
                id="display_name_help"
                className="mt-1 text-xs text-muted-foreground"
              >
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
                <p
                  id="full_name_help"
                  className="mt-1 text-xs text-muted-foreground"
                >
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
                <p
                  id="email_help"
                  className="mt-1 text-xs text-muted-foreground"
                >
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
                <p
                  id="phone_help"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  Contato rápido fora da sessão. Não é enviado nada
                  automaticamente.
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
