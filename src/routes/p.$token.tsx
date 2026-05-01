/**
 * Rota PÚBLICA do magic link.
 *
 * Constraints (magic-link-rules-locked):
 *  - Sem layout autenticado.
 *  - Sem sessão.
 *  - Sem login.
 *  - Sem PHI na URL além do token opaco (single-use, hashed no DB).
 *  - Mensagem neutra para qualquer falha.
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
import {
  ActivityPlayer,
  getCompletionStats,
  type QuizConfig,
} from "@/features/activities/components/ActivityPlayer";
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
  const config = resolved.activity.config as QuizConfig;
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [resultPdf, setResultPdf] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<{
    draft: Record<string, number>;
    completionPercent: number;
  } | null>(null);

  // 1. Try to load draft once on mount.
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
    setStarted(true);
  }, [draftPrompt]);

  const restartDraft = useCallback(async () => {
    setDraftPrompt(null);
    setResponses({});
    setStarted(true);
    try {
      await discardActivityDraft({ data: { token } });
    } catch {
      // ignore
    }
  }, [token]);

  // 2. Autosave debounced.
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMutation = useMutation({
    mutationFn: (payload: { draft: Record<string, number>; completionPercent: number }) =>
      saveActivityDraft({
        data: {
          token,
          draft: payload.draft,
          completionPercent: payload.completionPercent,
        },
      }),
    onSuccess: () => setSavedAt(Date.now()),
  });

  const { total, answered, completion, allAnswered } = getCompletionStats(config, responses);

  useEffect(() => {
    if (submitted || draftPrompt || !started) return;
    if (Object.keys(responses).length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ draft: responses, completionPercent: completion });
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [responses, completion, saveMutation, submitted, draftPrompt, started]);

  // 3. Submit
  const submitMutation = useMutation({
    mutationFn: () =>
      submitActivityResponse({ data: { token, responses } }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.pdf) setResultPdf(data.pdf);
    },
  });

  const expires = resolved.expiresAt ? formatExpires(resolved.expiresAt) : null;

  // Thank you screen
  if (submitted) {
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
        </div>
      </div>
    );
  }

  // Welcome / intro screen before starting
  if (!started && !draftPrompt) {
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
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-md mx-auto">
              {config.introduction}
            </p>
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
              onClick={() => setStarted(true)}
              className="px-8 py-3 rounded-xl bg-[var(--sage)] text-white text-sm font-medium hover:bg-[var(--sage)]/90 transition-all shadow-sm hover:shadow-md"
            >
              Começar
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Suas respostas são criptografadas e enviadas apenas à sua terapeuta.
          </p>
        </div>
      </div>
    );
  }

  // Player
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/40">
        <span className="font-display text-sm text-foreground truncate">
          {resolved.activity.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {saveMutation.isPending
            ? "Salvando…"
            : savedAt
              ? "Progresso salvo."
              : ""}
        </span>
      </header>

      {/* Player fills remaining space */}
      <div className="flex-1 flex flex-col">
        <ActivityPlayer
          config={config}
          responses={responses}
          onResponse={(qId, val) =>
            setResponses((prev) => ({ ...prev, [qId]: val }))
          }
          onSubmit={() => submitMutation.mutate()}
          submitting={submitMutation.isPending}
          submitLabel="Enviar respostas"
        />
      </div>

      {submitMutation.isError && (
        <div className="px-6 py-3 text-center">
          <p className="text-sm text-destructive">{NEUTRAL_MESSAGE}</p>
        </div>
      )}

      {/* Resume draft modal */}
      <Dialog open={!!draftPrompt} onOpenChange={(open) => !open && setDraftPrompt(null)}>
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
