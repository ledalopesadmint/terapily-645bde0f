/**
 * PatientPickerSheet — gaveta lateral para selecionar paciente no Acervo.
 *
 * Fluxo: terapeuta clica "Em sessão" em qualquer card → abre Sheet →
 * busca/seleciona paciente ativo → dispara assignActivity(in_session) →
 * navega pro perfil do paciente com o player aberto.
 *
 * Regras:
 * - Lista apenas pacientes ativos (status=active, deleted_at IS NULL).
 * - Busca por display_name (não-PHI).
 * - Após selecionar, navega para /patients/$id (o in-session player
 *   é aberto automaticamente via search param).
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Play, Users, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { listPatients } from "@/features/patients/patients.functions";
import {
  assignActivity,
  listAvailableActivities,
} from "@/features/activities/activities.functions";
import type { Activity } from "./library.types";

interface PatientPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Atividade selecionada no Acervo (seed/catalog shape). */
  activity: Activity | null;
  workspaceId: string | undefined;
  /** Modo de entrega — in_session abre player, shared_link navega pro modal de envio. */
  mode?: "in_session" | "shared_link";
}

export function PatientPickerSheet({
  open,
  onOpenChange,
  activity,
  workspaceId,
  mode = "in_session",
}: PatientPickerSheetProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // Lista pacientes ativos
  const patientsQuery = useQuery({
    queryKey: ["patients", "active", search],
    queryFn: () =>
      listPatients({
        data: { status: "active" as const, search: search || undefined, limit: 50 },
      }),
    enabled: open,
    staleTime: 10_000,
  });

  // Precisamos do ID real da atividade no banco (não o seed id)
  const catalogQuery = useQuery({
    queryKey: ["activity-catalog", workspaceId],
    queryFn: () =>
      listAvailableActivities(
        workspaceId ? { data: { workspaceId } } : {},
      ),
    enabled: open && !!activity,
    staleTime: 30_000,
  });

  // Encontrar a atividade real no banco pelo slug/code/uuid
  const findRealActivityId = (): string | null => {
    if (!activity) return null;
    const catalog = catalogQuery.data?.activities ?? [];

    // Se activity.id já é UUID (veio do banco via featured), usa direto
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRe.test(activity.id)) {
      const exists = catalog.find((a) => a.id === activity.id);
      if (exists) return exists.id;
    }

    // Prioridade 1: match por slug (mais confiável, 1:1 com seed id)
    const bySlug = catalog.find(
      (a) => a.slug?.toLowerCase() === activity.id.toLowerCase(),
    );
    if (bySlug) return bySlug.id;

    // Prioridade 2: match por code (pode ter duplicatas — menos confiável)
    if (activity.code) {
      for (const a of catalog) {
        const code = ((a as Record<string, unknown>).config as Record<string, unknown> | null)?.code as string | undefined;
        if (code && code.toLowerCase() === activity.code.toLowerCase()) return a.id;
      }
    }

    return null;
  };

  const [assigningPatientId, setAssigningPatientId] = useState<string | null>(null);

  const assignMutation = useMutation({
    mutationKey: ["assign-activity", activity?.id],
    mutationFn: async (patientId: string) => {
      // Prevent double-fire: if already assigning for this patient, bail
      if (assigningPatientId) throw new Error("Já atribuindo…");
      setAssigningPatientId(patientId);
      const realId = findRealActivityId();
      if (!realId) throw new Error("Atividade não disponível no workspace.");
      if (!workspaceId) throw new Error("Workspace não encontrado.");
      return assignActivity({
        data: {
          patientId,
          workspaceId,
          activityId: realId,
          deliveryMode: "in_session",
          expiresInHours: 1, // in_session = 1h fixo
        },
      });
    },
    onSettled: () => setAssigningPatientId(null),
    onSuccess: (res, patientId) => {
      qc.invalidateQueries({ queryKey: ["patient-activities", patientId] });
      onOpenChange(false);
      setSearch("");
      toast.success(`${activity?.name ?? "Atividade"} pronta.`, {
        description: "Abrindo sessão…",
      });
      // Navega pro perfil do paciente com param pra abrir o player
      navigate({
        to: "/patients/$id",
        params: { id: patientId },
        search: { startSession: res.id },
      });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível iniciar.");
    },
  });

  const handlePatientSelect = (patientId: string) => {
    if (mode === "shared_link") {
      // Navigate to patient page with assign dialog pre-opened
      const realId = findRealActivityId();
      if (!realId) {
        toast.error("Atividade não disponível no workspace.");
        return;
      }
      onOpenChange(false);
      setSearch("");
      navigate({
        to: "/patients/$id",
        params: { id: patientId },
        search: { openAssign: realId },
      });
    } else {
      assignMutation.mutate(patientId);
    }
  };

  const isSharedLink = mode === "shared_link";
  const patients = patientsQuery.data?.patients ?? [];
  const isLoading = patientsQuery.isLoading || catalogQuery.isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="font-display text-xl">
            Selecionar paciente
          </SheetTitle>
          <SheetDescription>
            {activity
              ? isSharedLink
                ? `Enviar ${activity.name} por link — escolha o paciente.`
                : `Aplicar ${activity.name} em sessão — escolha quem atender agora.`
              : "Escolha um paciente."}
          </SheetDescription>
        </SheetHeader>

        {/* Busca */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por apelido…"
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Lista */}
        <ScrollArea className="mt-4 flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Carregando…
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Nenhum paciente encontrado."
                  : "Nenhum paciente ativo."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {patients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={assignMutation.isPending}
                  onClick={() => handlePatientSelect(p.id)}
                  className="
                    flex w-full items-center justify-between gap-3 rounded-lg
                    px-3 py-3 text-left
                    transition-colors hover:bg-sage/10
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    disabled:opacity-50
                  "
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.display_name}
                    </p>
                    {p.initials && (
                      <p className="text-xs text-muted-foreground">
                        {p.initials}
                      </p>
                    )}
                  </div>
                  {isSharedLink ? (
                    <Send className="h-4 w-4 shrink-0 text-sage" />
                  ) : (
                    <Play className="h-4 w-4 shrink-0 text-sage" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Nota de segurança */}
        <p className="mt-auto border-t border-border pt-3 text-[0.6875rem] text-muted-foreground">
          A sessão dura 1 hora. O paciente responde no seu dispositivo — sem
          criar conta.
        </p>
      </SheetContent>
    </Sheet>
  );
}
