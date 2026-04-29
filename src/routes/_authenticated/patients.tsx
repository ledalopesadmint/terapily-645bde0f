/**
 * Rota /patients — orquestra apenas estado e mutations.
 * Toda apresentação vive em `src/features/patients/components/*`.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  listPatients,
  setPatientLifecycle,
  revealPatientContact,
  getPatientUsage,
} from "@/features/patients/patients.functions";
import type {
  LimitReachedInfo,
  PatientDTO,
  PatientStatusFilter,
} from "@/features/patients/patients.types";
import { PatientList } from "@/features/patients/components/PatientList";
import { PatientForm } from "@/features/patients/components/PatientForm";
import { RevealContactDialog } from "@/features/patients/components/RevealContactDialog";
import { DeletePatientDialog } from "@/features/patients/components/DeletePatientDialog";
import { PatientLimitBanner } from "@/features/patients/components/PatientLimitBanner";
import { PatientLimitModal } from "@/features/patients/components/PatientLimitModal";
import { copyAndAutoClear } from "@/features/patients/components/utils";

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

function PatientsPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [status, setStatus] = useState<PatientStatusFilter>("active");
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<PatientDTO | null>(null);
  const [editing, setEditing] = useState<PatientDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PatientDTO | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  // Info autoritativa vinda do servidor quando o limite é batido.
  // Tem prioridade sobre `usage` (que é só preview e pode estar stale/falho).
  const [limitInfo, setLimitInfo] = useState<LimitReachedInfo | null>(null);

  const patientsQuery = useQuery({
    queryKey: ["patients", status, search],
    queryFn: () =>
      listPatients({
        data: { status, search: search || undefined, limit: 50 },
      }),
    staleTime: 10_000,
  });

  const usageQuery = useQuery({
    queryKey: ["patients", "usage"],
    queryFn: () => getPatientUsage(),
    // Banner é um espelho do limite — outro membro do workspace pode criar
    // ou arquivar paciente. staleTime curto + refetch on focus mantém
    // próximo do real sem martelar o servidor. O bloqueio real continua
    // no servidor (createPatient + trigger BEFORE INSERT).
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
  const usage = usageQuery.data;

  const lifecycleMutation = useMutation({
    mutationFn: (input: {
      id: string;
      action: "archive" | "restore_active" | "soft_delete";
    }) => setPatientLifecycle({ data: input }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", "usage"] });
      const labels = {
        archive: "Paciente arquivado.",
        restore_active: "Paciente reativado.",
        soft_delete: "Excluído. 30 dias pra restaurar.",
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
        <div className="flex items-center gap-3">
          <Tabs
            value={status}
            onValueChange={(v) => setStatus(v as PatientStatusFilter)}
          >
            <TabsList>
              <TabsTrigger value="active">Ativos</TabsTrigger>
              <TabsTrigger value="archived">Arquivados</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/patients/deleted">
              <Trash className="mr-2 h-4 w-4" /> Excluídos
            </Link>
          </Button>
        </div>

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

      {usage && usage.max != null ? (
        <div className="mt-6">
          <PatientLimitBanner
            used={usage.used}
            max={usage.max}
            tier={usage.tier}
            onJoinWaitlist={() => {
              // Banner é só preview — usa os dados da query.
              setLimitInfo({ tier: usage.tier, max: usage.max as number });
              setLimitModalOpen(true);
            }}
          />
        </div>
      ) : null}

      <section className="mt-6">
        <PatientList
          patients={patients}
          status={status}
          isLoading={patientsQuery.isLoading}
          copying={revealMutation.isPending}
          onOpenDetails={setDetails}
          onCopyContact={handleCopy}
          onCreate={() => setCreating(true)}
        />
      </section>

      <RevealContactDialog
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

      <PatientForm
        open={creating}
        onOpenChange={(o) => !o && setCreating(false)}
        patient={null}
        onLimitReached={(info) => {
          // Servidor é a fonte da verdade. Mesmo que `usage` esteja
          // desatualizado, em loading ou tenha falhado, o modal abre com
          // os dados corretos (tier + max) vindos do erro do servidor.
          setCreating(false);
          setLimitInfo(info);
          setLimitModalOpen(true);
          // Revalida o usage pra próximo banner refletir o estado real.
          queryClient.invalidateQueries({ queryKey: ["patients", "usage"] });
        }}
        onSaved={() => {
          setCreating(false);
          queryClient.invalidateQueries({ queryKey: ["patients"] });
          queryClient.invalidateQueries({ queryKey: ["patients", "usage"] });
        }}
      />

      <PatientForm
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        patient={editing}
        onSaved={() => {
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: ["patients"] });
          queryClient.invalidateQueries({ queryKey: ["patients", "usage"] });
        }}
      />

      <DeletePatientDialog
        patient={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={(p) =>
          lifecycleMutation.mutate({ id: p.id, action: "soft_delete" })
        }
        pending={lifecycleMutation.isPending}
      />

      {/*
        Modal de limite — sempre renderizado quando aberto.
        Prioriza `limitInfo` (servidor, autoritativo) sobre `usage` (preview).
        Sem fallback "esconde tudo": se nenhum dos dois existir, usamos
        defaults defensivos pra mensagem ainda fazer sentido.
      */}
      {limitModalOpen ? (
        <PatientLimitModal
          open={limitModalOpen}
          onOpenChange={(o) => {
            setLimitModalOpen(o);
            if (!o) setLimitInfo(null);
          }}
          tier={limitInfo?.tier ?? usage?.tier ?? "basic"}
          max={limitInfo?.max ?? usage?.max ?? 0}
          ownerEmail={auth.user?.email ?? null}
        />
      ) : null}
    </div>
  );
}
