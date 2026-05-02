/**
 * PatientPickerSheet — gaveta lateral para selecionar paciente no Acervo.
 *
 * Fluxo: terapeuta clica "Em sessão" em qualquer card → abre Sheet →
 * busca/seleciona paciente ativo → dispara assignActivity(in_session) →
 * navega pro perfil do paciente com o player aberto.
 *
 * Para atividades de mindfulness com mode=shared_link:
 * → cria um habit link (reutilizável) em vez do magic link single-use.
 * → mostra URL para copiar/compartilhar pelo canal preferido.
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
import { Search, Play, Users, Send, Copy, Check, Link2 } from "lucide-react";
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
import { createHabitLink, HABIT_LINK_CATEGORIES } from "@/features/habits/habits.functions";
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
  const [habitLinkUrl, setHabitLinkUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Is this a habit-link-eligible activity?
  const isHabitEligible = activity
    ? HABIT_LINK_CATEGORIES.has(activity.category)
    : false;
  const useHabitLink = isHabitEligible && mode === "shared_link";

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

  // Regular in_session assign mutation
  const assignMutation = useMutation({
    mutationKey: ["assign-activity", activity?.id],
    mutationFn: async (patientId: string) => {
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

  // Habit link creation mutation
  const habitLinkMutation = useMutation({
    mutationKey: ["create-habit-link", activity?.id],
    mutationFn: async (patientId: string) => {
      const realId = findRealActivityId();
      if (!realId) throw new Error("Atividade não disponível no workspace.");
      if (!workspaceId) throw new Error("Workspace não encontrado.");
      return createHabitLink({
        data: {
          patientId,
          workspaceId,
          activityId: realId,
        },
      });
    },
    onSuccess: (res) => {
      if (res.rawToken) {
        // New link created — show URL
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${baseUrl}/h/${res.rawToken}`;
        setHabitLinkUrl(url);
        toast.success("Link de prática criado.", {
          description: `Expira em ${formatExpiration(res.expiresAt)}.`,
        });
      } else if (res.alreadyExists) {
        toast.info("Este paciente já tem um link ativo para esta atividade.", {
          description: "Revogue o atual antes de criar um novo.",
        });
        setHabitLinkUrl(null);
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar o link.");
    },
  });

  const handlePatientSelect = (patientId: string) => {
    if (useHabitLink) {
      // Create reusable habit link
      habitLinkMutation.mutate(patientId);
    } else if (mode === "shared_link") {
      // Regular magic link flow (non-mindfulness)
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

  const handleCopy = async () => {
    if (!habitLinkUrl) return;
    try {
      await navigator.clipboard.writeText(habitLinkUrl);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setHabitLinkUrl(null);
      setCopied(false);
      setSearch("");
    }
    onOpenChange(nextOpen);
  };

  const isSharedLink = mode === "shared_link";
  const patients = patientsQuery.data?.patients ?? [];
  const isLoading = patientsQuery.isLoading || catalogQuery.isLoading;
  const isPending = assignMutation.isPending || habitLinkMutation.isPending;

  // If we have a habit link URL, show the share view
  if (habitLinkUrl) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="font-display text-xl">
              Link de prática criado
            </SheetTitle>
            <SheetDescription>
              Envie pelo seu canal preferido — WhatsApp, SMS ou email.
              O paciente pode usar quantas vezes quiser até o link expirar.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Activity name */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link2 className="h-4 w-4 text-sage" />
              <span className="font-medium text-foreground">{activity?.name}</span>
              <span>· Reutilizável</span>
            </div>

            {/* URL box */}
            <div className="rounded-xl border border-sage/20 bg-sage/5 p-4">
              <p className="break-all text-sm font-mono text-foreground/80 select-all">
                {habitLinkUrl}
              </p>
            </div>

            {/* Copy button */}
            <Button
              onClick={handleCopy}
              className="w-full gap-2"
              variant={copied ? "outline" : "default"}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar link
                </>
              )}
            </Button>
          </div>

          <p className="mt-auto border-t border-border pt-3 text-[0.6875rem] text-muted-foreground">
            Este é um link reutilizável — cada prática completada é registrada
            automaticamente no perfil do paciente. Você pode revogar a qualquer momento.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="font-display text-xl">
            Selecionar paciente
          </SheetTitle>
          <SheetDescription>
            {activity
              ? useHabitLink
                ? `Criar link de prática de ${activity.name} — escolha o paciente.`
                : isSharedLink
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
                  disabled={isPending}
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
                  {useHabitLink ? (
                    <Link2 className="h-4 w-4 shrink-0 text-sage" />
                  ) : isSharedLink ? (
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
          {useHabitLink
            ? "O link é reutilizável — o paciente pratica quantas vezes quiser. Cada execução é registrada."
            : isSharedLink
              ? "Você enviará o link pelo seu canal preferido — WhatsApp, SMS ou email."
              : "A sessão dura 1 hora. O paciente responde no seu dispositivo — sem criar conta."}
        </p>
      </SheetContent>
    </Sheet>
  );
}

// --- Helpers ---------------------------------------------------------------

function formatExpiration(expiresAt: string): string {
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffMs = exp.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 1) return "24 horas";
  if (days <= 7) return `${days} dias`;
  if (days <= 30) return `${Math.ceil(days / 7)} semanas`;
  return `${Math.ceil(days / 30)} meses`;
}
