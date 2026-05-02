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
import { getOGMeta } from "@/features/activities/og-meta.functions";
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
  loader: async ({ params }) => {
    try {
      const meta = await getOGMeta({ data: { token: params.token } });
      return { meta, token: params.token };
    } catch {
      return { meta: null, token: params.token };
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.meta?.title ?? "Activity";
    const slug = loaderData?.meta?.slug;
    const token = loaderData?.token ?? "";
    const ogImage = slug
      ? `https://www.terapily.com/brand/og/${slug}.jpg`
      : "https://www.terapily.com/brand/og-magic-link.jpg";
    const ogTitle = `Your therapist sent you: ${title}`;
    const ogDesc = "Open this secure link to begin. Your responses are encrypted and sent only to your therapist.";
    const ogUrl = `https://www.terapily.com/p/${token}`;

    return {
      meta: [
        { title: `${title} — Terapily` },
        
        { property: "og:url", content: ogUrl },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDesc },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: `terapily — ${title}` },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Terapily" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: ogDesc },
        { name: "twitter:image", content: ogImage },
      ],
    };
  },
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

type PagePhase = "intro" | "consent" | "activity" | "declined" | "submitted";

function PublicActivityPage() {
  const { token } = useParams({ from: "/p/$token" });
  const [vinhetaDone, setVinhetaDone] = useState(false);

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

  // Vinheta IS the loading state — show it until both vinheta finishes AND data is ready
  if (!vinhetaDone || resolveQuery.isLoading) {
    return (
      <div className="relative min-h-screen bg-[var(--cream)]">
        <VinhetaIntro onComplete={() => setVinhetaDone(true)} volumePercent={60} />
      </div>
    );
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
  const [phase, setPhase] = useState<PagePhase>("intro");
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
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  const completion = isForm
    ? getFormCompletion(config, responses).completion
    : getCompletionStats(config, responses as Record<string, number>).completion;
  const completionRef = useRef(completion);
  completionRef.current = completion;

  const saveDraftNow = useCallback(async () => {
    const current = responsesRef.current;
    if (Object.keys(current).length === 0) return;
    try {
      setSaving(true);
      await saveActivityDraft({
        data: {
          token,
          draft: current,
          completionPercent: completionRef.current,
        },
      });
      setSavedAt(Date.now());
    } catch (e) {
      console.warn("[autosave] failed", e);
    } finally {
      setSaving(false);
    }
  }, [token]);

  // Auto-save debounced 1s after each response change
  useEffect(() => {
    if (phase !== "activity" || draftPrompt) return;
    if (Object.keys(responses).length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraftNow();
    }, 1000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [responses, phase, draftPrompt, saveDraftNow]);

  // --- Manual save ("Salvar e continuar depois") ---
  const manualSave = useCallback(() => {
    saveDraftNow();
  }, [saveDraftNow]);

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

  // === PHASE: INTRO (branded social card) ===
  if (phase === "intro" || phase === "consent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4 py-8">
        <div className="w-full max-w-md">
          {/* --- Premium branded card --- */}
          <div className="overflow-hidden rounded-2xl border border-[var(--sage)]/20 bg-white shadow-[0_8px_40px_-12px_rgba(31,42,54,0.12)]">
            {/* Card header — sage accent bar + wordmark */}
            <div className="relative bg-[var(--navy)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sage)]/20">
                  <svg className="h-5 w-5 text-[var(--sage)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <span className="font-display text-lg text-white tracking-wide">terapily</span>
                  <p className="text-xs text-white/50 mt-0.5">Secure therapeutic activity</p>
                </div>
              </div>
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--sage)]/5 to-transparent pointer-events-none" />
            </div>

            {/* Card body */}
            <div className="px-6 py-6 space-y-5">
              {/* Eyebrow */}
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--sage)]">
                Sua terapeuta enviou
              </p>

              {/* Activity title */}
              <h1 className="font-display text-2xl md:text-3xl text-[var(--navy)] leading-tight">
                {resolved.activity.title}
              </h1>

              {/* Introduction text (collapsible for long intros) */}
              {config?.introduction && (
                <div className="text-[var(--charcoal)]/80 text-sm leading-relaxed space-y-2.5 border-l-2 border-[var(--sage)]/30 pl-4">
                  {(config.introduction as string).split("\n\n").slice(0, 2).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {/* Expiry notice */}
              {expires && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  expires.urgent
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : "bg-[var(--cream)] text-[var(--charcoal)]/70 border border-[var(--sage)]/10"
                }`}>
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {expires.label}
                </div>
              )}

              {/* CTA button */}
              <button
                onClick={() => setPhase("consent")}
                className="w-full py-3.5 rounded-xl bg-[var(--sage)] text-white text-sm font-medium hover:bg-[var(--sage)]/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Começar atividade
              </button>
            </div>

            {/* Card footer — trust signals */}
            <div className="border-t border-[var(--sage)]/10 bg-[var(--cream)]/50 px-6 py-3.5">
              <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--charcoal)]/50">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Criptografado
                </span>
                <span className="h-2.5 w-px bg-[var(--charcoal)]/15" />
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Só sua terapeuta vê
                </span>
                <span className="h-2.5 w-px bg-[var(--charcoal)]/15" />
                <span>terapily.com</span>
              </div>
            </div>
          </div>

          {/* Subtle brand reinforcement below card */}
          <p className="mt-4 text-center text-[10px] text-[var(--charcoal)]/30">
            Powered by Terapily — therapeutic tools your clients actually finish.
          </p>
        </div>

        {/* Consent modal opens when phase === "consent" */}
        <ConsentGate
          open={phase === "consent"}
          loading={consentMutation.isPending}
          onAccept={() => consentMutation.mutate(true)}
          onDecline={() => consentMutation.mutate(false)}
          onClose={() => setPhase("intro")}
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
            {saving
              ? "Salvando…"
              : savedAt
                ? "Progresso salvo."
                : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={manualSave}
            disabled={saving || Object.keys(responses).length === 0}
            className="text-xs"
          >
            {saving ? "Salvando…" : "Salvar e continuar depois"}
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
