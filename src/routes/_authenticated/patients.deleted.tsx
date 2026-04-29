import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Button } from "@/components/ui/button";
import {
  listDeletedPatients,
  restorePatient,
} from "@/features/patients/patients.functions";
import {
  isLimitReachedError,
  parseLimitReachedError,
  type LimitReachedInfo,
} from "@/features/patients/patients.types";
import { PatientLimitModal } from "@/features/patients/components/PatientLimitModal";

export const Route = createFileRoute("/_authenticated/patients/deleted")({
  head: () => ({
    meta: [
      { title: "Pacientes excluídos · Terapily" },
      {
        name: "description",
        content:
          "Pacientes excluídos nos últimos 30 dias, com opção de restauração.",
      },
    ],
  }),
  component: DeletedPatientsPage,
});

function DeletedPatientsPage() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [limitInfo, setLimitInfo] = useState<LimitReachedInfo | null>(null);

  const query = useQuery({
    queryKey: ["patients", "deleted"],
    queryFn: () => listDeletedPatients(),
    staleTime: 10_000,
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => restorePatient({ data: { id } }),
    onSuccess: () => {
      toast.success("Paciente restaurado.");
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (err: Error) => {
      // Limite cheio: o servidor (assert_patient_capacity) lança o marker
      // estruturado. Aqui abrimos o modal de upgrade em vez de toast cru,
      // porque a ação correta do terapeuta é abrir vaga (excluir um ativo)
      // ou fazer upgrade — não tentar de novo.
      if (isLimitReachedError(err)) {
        const info = parseLimitReachedError(err);
        if (info) {
          setLimitInfo(info);
          return;
        }
      }
      toast.error(err.message);
    },
  });

  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/patients">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar pra Pacientes
        </Link>
      </Button>

      <Eyebrow>Pacientes excluídos</Eyebrow>
      <h1 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
        Janela de restauração.
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Estes pacientes foram excluídos e serão apagados <strong>em definitivo</strong> após
        30 dias. Você pode restaurar a qualquer momento dentro desse período. Após o prazo,
        o nome, email e telefone são removidos do banco e não podem ser recuperados (o
        registro mínimo de auditoria permanece, sem dados pessoais).
      </p>
      <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
        Restaurar ocupa uma vaga do seu plano. Se o plano estiver cheio, exclua
        um paciente ativo ou arquivado primeiro — ou faça upgrade.
      </p>

      <section className="mt-10">
        {query.isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="font-display text-2xl text-foreground">
              Nenhum paciente excluído nos últimos 30 dias.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Quando você excluir alguém, aparecerá aqui pra restaurar caso mude de ideia.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
                    {p.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {p.display_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.tags.length > 0 ? p.tags.join(" · ") : "Sem etiquetas"} ·
                      Excluído em {new Date(p.deleted_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs ${
                      p.days_left <= 3
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {p.days_left === 0
                      ? "Será apagado hoje"
                      : p.days_left === 1
                        ? "Resta 1 dia"
                        : `Restam ${p.days_left} dias`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restoreMut.mutate(p.id)}
                    disabled={restoreMut.isPending}
                  >
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {limitInfo ? (
        <PatientLimitModal
          open={limitInfo !== null}
          onOpenChange={(o) => !o && setLimitInfo(null)}
          tier={limitInfo.tier}
          max={limitInfo.max}
          ownerEmail={auth.user?.email ?? null}
        />
      ) : null}
    </div>
  );
}
