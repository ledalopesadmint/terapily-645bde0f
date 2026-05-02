/**
 * Rota PÚBLICA do magic link.
 *
 * Fluxo completo:
 *  1. Vinheta (3s brand intro)
 *  2. Tela de introdução (título + texto acolhedor + botão "Começar")
 *  3. Botão "Começar" abre modal de consentimento
 *  4. Aceito → atividade com autosave + "Salvar e continuar depois"
 *  5. Não aceito → confirmação → link encerrado → notifica terapeuta
 *
 * Constraints (magic-link-rules-locked):
 *  - Sem layout autenticado. Sem sessão. Sem login.
 *  - Sem PHI na URL. Mensagem neutra para falha.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolvePublicToken, submitActivityResponse } from "@/features/activities/public-activities.functions";
import {
  saveActivityDraft,
  getActivityDraft,
  discardActivityDraft,
} from "@/features/activities/activity-drafts.functions";
import { recordActivityConsent } from "@/features/activities/consent.functions";
import {
  ActivityPlayer,
  getCompletionStats,
  type QuizConfig,
} from "@/features/activities/components/ActivityPlayer";
import {
  FormRunner,
  getFormCompletion,
} from "@/features/library/runners/structured_form/FormRunner";
import type { StructuredFormConfig } from "@/features/library/runners/structured_form/form-types";
import { ConsentGate } from "@/features/activities/components/ConsentGate";
import { VinhetaIntro } from "@/features/activities/components/VinhetaIntro";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/p/$token")({
  head: () => ({
    meta: [
      { title: "Atividade — Terapily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicActivityPage,
});

const NEUTRAL_MESSAGE = "Este link não está disponível. Peça um novo link ao seu terapeuta.";

function formatExpires(iso: string): { label: string; urgent: boolean } {
  const target = new Date(iso).getTime();
  const diffMs = target - Date.now();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 24) {
    return { label: "Este link expira em menos de 24 horas.", urgent: true };
  }
  const days = Math.ceil(hours / 24);
  return { label: `Este link expira em ${days} dia${days > 1 ? "s" : ""}.`, urgent: false };
}

type PagePhase = "vinheta" | "intro" | "consent" | "activity" | "declined" | "submitted";

function PublicActivityPage() {
  const { token } = useParams({ from: "/p/$token" });

  const resolveQuery = useQuery({
    queryKey: ["public-activity", token],
    queryFn: async () => {
      try {
        return await resolvePublicToken({ data: { token } });
      } catch {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (resolveQuery.isLoading) {
    return <CenterShell><p className="text-muted-foreground">Carregando…</p></CenterShell>;
  }

  if (!resolveQuery.data) {
    return (
      <CenterShell>
        <h1 className="font-display text-3xl text-foreground">Link indisponível</h1>
        <p className="mt-3 text-muted-foreground">{NEUTRAL_MESSAGE}</p>
      </CenterShell>
    );
  }

  return <ActivityRunner token={token} resolved={resolveQuery.data} />;
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {children}
      </div>
    </div>
  );
}

interface ResolvedActivity {
  activity: {
    slug: string;
    title: string;
    archetype: string;
    config: unknown;
  };
  expiresAt: string | null;
}

function ActivityRunner({
  token,
  resolved,
}: {
  token: string;
  resolved: ResolvedActivity;
}) {
  const archetype = resolved.activity.archetype;
  const isForm = archetype === "structured_form";
  const config = resolved.activity.config as QuizConfig & StructuredFormConfig;
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [resultPdf, setResultPdf] = useState<string | null>(null);
  const [phase, setPhase] = useState<PagePhase>("vinheta");
  const [draftPrompt, setDraftPrompt] = useState<{
    draft: Record<string, unknown>;
    completionPercent: number;
  } | null>(null);

  // --- Draft load on mount ---
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      try {
        const r = await getActivityDraft({ data: { token } });
        if (r.hasDraft) {
          const parsed = JSON.parse(r.draftJson) as Record<string, number>;
          if (parsed && Object.keys(parsed).length > 0) {
            setDraftPrompt({ draft: parsed, completionPercent: r.completionPercent });
          }
        }
      } catch {
        // silent
      }
    })();
  }, [token]);

  const acceptDraft = useCallback(() => {
    if (draftPrompt) setResponses(draftPrompt.draft);
    setDraftPrompt(null);
    setPhase("activity");
  }, [draftPrompt]);

  const restartDraft = useCallback(async () => {
    setDraftPrompt(null);
    setResponses({});
    setPhase("activity");
    try {
      await discardActivityDraft({ data: { token } });
    } catch {
      // ignore
    }
  }, [token]);

  // --- Consent ---
  const consentMutation = useMutation({
    mutationFn: (accepted: boolean) =>
      recordActivityConsent({ data: { token, accepted } }),
    onSuccess: (result) => {
      if (result.accepted) {
        // If draft exists, show draft prompt; otherwise start activity
        if (draftPrompt) {
          setPhase("activity"); // draft dialog will show over activity
        } else {
          setPhase("activity");
        }
      } else {
        setPhase("declined");
      }
    },
  });

  // --- Autosave ---
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMutation = useMutation({
    mutationFn: (payload: { draft: Record<string, unknown>; completionPercent: number }) =>
      saveActivityDraft({
        data: {
          token,
          draft: payload.draft,
          completionPercent: payload.completionPercent,
        },
      }),
    onSuccess: () => setSavedAt(Date.now()),
  });

  const completion = isForm
    ? getFormCompletion(config, responses).completion
    : getCompletionStats(config, responses as Record<string, number>).completion;

  useEffect(() => {
    if (phase !== "activity" || draftPrompt) return;
    if (Object.keys(responses).length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ draft: responses, completionPercent: completion });
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [responses, completion, saveMutation, phase, draftPrompt]);

  // --- Manual save ("Salvar e continuar depois") ---
  const manualSave = useCallback(() => {
    if (Object.keys(responses).length === 0) return;
    saveMutation.mutate(
      { draft: responses, completionPercent: completion },
      {
        onSuccess: () => {
          setSavedAt(Date.now());
        },
      },
    );
  }, [responses, completion, saveMutation]);

  // --- Submit ---
  const submitMutation = useMutation({
    mutationFn: () =>
      submitActivityResponse({ data: { token, responses } }),
    onSuccess: (data) => {
      setPhase("submitted");
      if (data.pdf) setResultPdf(data.pdf);
    },
  });

  const expires = resolved.expiresAt ? formatExpires(resolved.expiresAt) : null;

  // === PHASE: VINHETA ===
  if (phase === "vinheta") {
    return (
      <div className="relative min-h-screen bg-[var(--cream)]">
        <VinhetaIntro onComplete={() => setPhase("intro")} volumePercent={60} />
      </div>
    );
  }

  // === PHASE: DECLINED ===
  if (phase === "declined") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-foreground">Consentimento recusado</h1>
          <p className="text-muted-foreground text-sm">
            Este link foi encerrado. O(a) terapeuta foi notificado(a) da sua decisão.
            Nenhuma resposta foi coletada.
          </p>
          <p className="text-xs text-muted-foreground">
            Você pode fechar esta página.
          </p>
        </div>
      </div>
    );
  }

  // === PHASE: SUBMITTED (Thank you) ===
  if (phase === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--sage)]/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--sage)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-foreground">Recebido. Obrigado.</h1>
          <p className="text-muted-foreground">
            Se precisar, fale com sua terapeuta. Você pode fechar esta página.
          </p>
          {resultPdf && (
            <button
              onClick={() => {
                const binary = atob(resultPdf);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const blob = new Blob([bytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `activity-result-${new Date().toISOString().slice(0, 10)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--sage)] text-white text-sm font-medium hover:bg-[var(--sage)]/90 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download your results
            </button>
          )}
        </div>
      </div>
    );
  }

  // === PHASE: INTRO ===
  if (phase === "intro" || phase === "consent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg text-center space-y-6">
          <p className="text-xs font-medium tracking-widest uppercase text-[var(--sage)]">
            Atividade
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-foreground leading-tight">
            {resolved.activity.title}
          </h1>
          {config?.introduction && (
            <div className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-md mx-auto space-y-3">
              {(config.introduction as string).split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {expires && (
            <p
              className={`text-xs ${
                expires.urgent ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {expires.label}
            </p>
          )}

          <div className="pt-2">
            <button
              onClick={() => setPhase("consent")}
              className="px-8 py-3 rounded-xl bg-[var(--sage)] text-white text-sm font-medium hover:bg-[var(--sage)]/90 transition-all shadow-sm hover:shadow-md"
            >
              Começar
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Suas respostas são criptografadas e enviadas apenas à sua terapeuta.
          </p>
        </div>

        {/* Consent modal opens when phase === "consent" */}
        <ConsentGate
          open={phase === "consent"}
          loading={consentMutation.isPending}
          onAccept={() => consentMutation.mutate(true)}
          onDecline={() => consentMutation.mutate(false)}
        />
      </div>
    );
  }

  // === PHASE: ACTIVITY ===
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/40">
        <span className="font-display text-sm text-foreground truncate">
          {resolved.activity.title}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {saveMutation.isPending
              ? "Salvando…"
              : savedAt
                ? "Progresso salvo."
                : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={manualSave}
            disabled={saveMutation.isPending || Object.keys(responses).length === 0}
            className="text-xs"
          >
            {saveMutation.isPending ? "Salvando…" : "Salvar e continuar depois"}
          </Button>
        </div>
      </header>

      {/* Player */}
      <div className="flex-1 flex flex-col">
        {isForm ? (
          <FormRunner
            config={config}
            responses={responses}
            onResponse={(fId, val) =>
              setResponses((prev) => ({ ...prev, [fId]: val }))
            }
            onSubmit={() => submitMutation.mutate()}
            submitting={submitMutation.isPending}
            submitLabel="Enviar respostas"
          />
        ) : (
          <ActivityPlayer
            config={config}
            responses={responses as Record<string, number>}
            onResponse={(qId, val) =>
              setResponses((prev) => ({ ...prev, [qId]: val }))
            }
            onSubmit={() => submitMutation.mutate()}
            submitting={submitMutation.isPending}
            submitLabel="Enviar respostas"
          />
        )}
      </div>

      {submitMutation.isError && (
        <div className="px-6 py-3 text-center">
          <p className="text-sm text-destructive">{NEUTRAL_MESSAGE}</p>
        </div>
      )}

      {/* Resume draft modal */}
      <Dialog open={!!draftPrompt && phase === "activity"} onOpenChange={(open) => !open && setDraftPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encontramos um progresso salvo</DialogTitle>
            <DialogDescription>
              Você havia respondido {draftPrompt?.completionPercent ?? 0}% desta atividade.
              Deseja continuar de onde parou?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={restartDraft}>
              Recomeçar
            </Button>
            <Button onClick={acceptDraft}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
