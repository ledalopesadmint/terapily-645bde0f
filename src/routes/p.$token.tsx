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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolvePublicToken, submitActivityResponse } from "@/server/public-activities.functions";
import {
  saveActivityDraft,
  getActivityDraft,
  discardActivityDraft,
} from "@/server/activity-drafts.functions";

export const Route = createFileRoute("/p/$token")({
  head: () => ({
    meta: [
      { title: "Atividade — Terapily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicActivityPage,
});

interface QuizQuestion {
  id: string;
  text: string;
  options: { value: number; label: string }[];
}

interface QuizConfig {
  introduction?: string;
  questions?: QuizQuestion[];
  scoring?: { questions?: { id: string }[] };
}

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
    queryFn: () => resolvePublicToken({ data: { token } }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (resolveQuery.isLoading) {
    return <CenterShell><p className="text-muted-foreground">Carregando…</p></CenterShell>;
  }

  if (resolveQuery.isError || !resolveQuery.data) {
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
  const questions = useMemo<QuizQuestion[]>(
    () => Array.isArray(config?.questions) ? config.questions : [],
    [config],
  );

  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<{
    draft: Record<string, number>;
    completionPercent: number;
  } | null>(null);

  // 1. Tenta carregar draft uma vez no mount.
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
        // mensagem neutra já exibida pelo resolve; aqui silenciamos.
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

  useEffect(() => {
    if (submitted || draftPrompt) return;
    if (Object.keys(responses).length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const total = questions.length || 1;
    const answered = Object.keys(responses).length;
    const pct = Math.min(100, Math.round((answered / total) * 100));
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ draft: responses, completionPercent: pct });
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [responses, questions.length, saveMutation, submitted, draftPrompt]);

  // 3. Submit final.
  const submitMutation = useMutation({
    mutationFn: () =>
      submitActivityResponse({ data: { token, responses } }),
    onSuccess: () => setSubmitted(true),
  });

  const expires = resolved.expiresAt ? formatExpires(resolved.expiresAt) : null;
  const total = questions.length;
  const answered = Object.keys(responses).length;
  const completion = total === 0 ? 0 : Math.round((answered / total) * 100);
  const allAnswered = total > 0 && answered === total;

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

        {/* Banner de expiração */}
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

        {/* Progresso */}
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

        {/* Perguntas */}
        {total === 0 ? (
          <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Esta atividade ainda não está pronta para resposta automática. Fale com sua terapeuta.
          </div>
        ) : (
          <ol className="space-y-6">
            {questions.map((q, idx) => (
              <li key={q.id} className="rounded-lg border border-border bg-card p-5">
                <Label className="text-base font-medium text-foreground">
                  {idx + 1}. {q.text}
                </Label>
                <RadioGroup
                  className="mt-4 space-y-2"
                  value={responses[q.id]?.toString() ?? ""}
                  onValueChange={(value) =>
                    setResponses((prev) => ({ ...prev, [q.id]: Number(value) }))
                  }
                >
                  {q.options.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-3">
                      <RadioGroupItem
                        id={`${q.id}-${opt.value}`}
                        value={opt.value.toString()}
                      />
                      <Label
                        htmlFor={`${q.id}-${opt.value}`}
                        className="font-normal text-sm text-foreground cursor-pointer"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </li>
            ))}
          </ol>
        )}

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

      {/* Modal de continuar de onde parou */}
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
