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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  }, [draftPrompt]);

  const restartDraft = useCallback(async () => {
    setDraftPrompt(null);
    setResponses({});
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
    if (submitted || draftPrompt) return;
    if (Object.keys(responses).length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ draft: responses, completionPercent: completion });
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [responses, completion, saveMutation, submitted, draftPrompt]);

  // 3. Submit
  const submitMutation = useMutation({
    mutationFn: () =>
      submitActivityResponse({ data: { token, responses } }),
    onSuccess: () => setSubmitted(true),
  });

  const expires = resolved.expiresAt ? formatExpires(resolved.expiresAt) : null;

  if (submitted) {
    return (
      <CenterShell>
        <h1 className="font-display text-3xl text-foreground">Recebido. Obrigado por completar.</h1>
        <p className="mt-3 text-muted-foreground">
          Se precisar, fale com sua terapeuta. Você pode fechar esta página.
        </p>
      </CenterShell>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="eyebrow text-muted-foreground">Atividade</p>
          <h1 className="font-display text-3xl text-foreground">
            {resolved.activity.title}
          </h1>
          {config?.introduction && (
            <p className="text-sm text-muted-foreground">{config.introduction}</p>
          )}
        </header>

        {/* Autosave banner */}
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Você pode começar agora e terminar depois. Seu progresso será salvo com segurança.
        </div>

        {/* Expiration banner */}
        {expires && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              expires.urgent
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            {expires.label}
          </div>
        )}

        {/* Progress */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{answered} de {total} respondidas</span>
              <span aria-live="polite">
                {saveMutation.isPending
                  ? "Salvando…"
                  : savedAt
                    ? "Progresso salvo."
                    : ""}
              </span>
            </div>
            <Progress value={completion} />
          </div>
        )}

        {/* Questions */}
        <ActivityPlayer
          config={config}
          responses={responses}
          onResponse={(qId, val) =>
            setResponses((prev) => ({ ...prev, [qId]: val }))
          }
        />

        {/* Submit */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            disabled={!allAnswered || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Enviando…" : "Enviar respostas"}
          </Button>
          {submitMutation.isError && (
            <p className="text-sm text-destructive text-center">{NEUTRAL_MESSAGE}</p>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Suas respostas são criptografadas e enviadas apenas à sua terapeuta.
          </p>
        </div>
      </div>

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
