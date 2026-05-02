/**
 * In-session player modal — terapeuta aplica atividade ao vivo.
 * Fullscreen presentation mode com ActivityPlayer (quiz_scale) ou FormRunner (structured_form).
 *
 * Features:
 *  - Auto-save draft (debounced 3s) ao banco cifrado.
 *  - Restaura draft ao reabrir.
 *  - Confirmation dialog ao fechar com progresso não enviado.
 */

import { useState, useCallback, useEffect, useRef, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Save, LogOut } from "lucide-react";
import { VinhetaIntro } from "./VinhetaIntro";
import { ScaleIntro } from "./ScaleIntro";

import {
  ActivityPlayer,
  getCompletionStats,
  type QuizConfig,
} from "./ActivityPlayer";
import {
  FormRunner,
  getFormCompletion,
} from "@/features/library/runners/structured_form/FormRunner";
import type { StructuredFormConfig } from "@/features/library/runners/structured_form/form-types";
import {
  getActivityConfig,
  recordInSessionResponse,
  saveInSessionDraft,
  loadInSessionDraft,
  deleteInSessionDraft,
} from "@/features/activities/activities.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface InSessionPlayerProps {
  patientActivityId: string;
  patientId: string;
  workspaceId: string;
  activityTitle: string;
  onClose: () => void;
}

export function InSessionPlayerDialog({
  patientActivityId,
  patientId,
  workspaceId,
  activityTitle,
  onClose,
}: InSessionPlayerProps) {
  const qc = useQueryClient();
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [formStepIndex, setFormStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [vinhetaDone, setVinhetaDone] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const handleVinhetaComplete = useCallback(() => setVinhetaDone(true), []);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  const formStepIndexRef = useRef(formStepIndex);
  formStepIndexRef.current = formStepIndex;

  const configQuery = useQuery({
    queryKey: ["activity-config", patientActivityId],
    queryFn: () =>
      getActivityConfig({ data: { patientActivityId } }),
    retry: false,
  });

  const archetype = configQuery.data?.activity?.archetype ?? "quiz_scale";
  const isForm = archetype === "structured_form";
  const config = (configQuery.data?.activity?.config ?? {}) as unknown as QuizConfig & StructuredFormConfig;

  const getCompletion = useCallback(() => {
    if (configQuery.isLoading) return { allAnswered: false, completion: 0 };
    if (isForm) return getFormCompletion(config, responses);
    const stats = getCompletionStats(config, responses as Record<string, number>);
    return { allAnswered: stats.allAnswered, completion: stats.completion };
  }, [configQuery.isLoading, isForm, config, responses]);

  const { allAnswered } = getCompletion();
  const hasAnyResponse = Object.keys(responses).length > 0;

  // ── Draft restore ───────────────────────────────────────────────
  useQuery({
    queryKey: ["in-session-draft", patientActivityId],
    queryFn: async () => {
      const result = await loadInSessionDraft({ data: { patientActivityId } });
      if (result.hasDraft && result.draft) {
        const restoredDraft = result.draft as Record<string, unknown>;
        const restoredMeta = restoredDraft.__terapily_meta as { formStepIndex?: unknown } | undefined;
        const restoredStep = typeof restoredMeta?.formStepIndex === "number" ? restoredMeta.formStepIndex : 0;
        const { __terapily_meta: _meta, ...restoredResponses } = restoredDraft;
        setResponses(restoredResponses);
        setFormStepIndex(restoredStep);
        setDraftRestored(true);
        // Skip vinheta + intro when resuming a draft
        setVinhetaDone(true);
        setIntroStarted(true);
        toast.info("Bem-vindo de volta! Seu progresso foi restaurado.", { duration: 4000 });
      }
      return result;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  // ── Draft auto-save (debounced 3s) ──────────────────────────────
  const saveDraftNow = useCallback(async () => {
    const current = responsesRef.current;
    if (Object.keys(current).length === 0) return;

    try {
      setDraftSaving(true);
      const completion = isForm
        ? getFormCompletion(config, current).completion
        : getCompletionStats(config, current as Record<string, number>).completion;

      await saveInSessionDraft({
        data: {
          patientActivityId,
          draft: {
            ...(current as Record<string, NonNullable<unknown>>),
            __terapily_meta: { formStepIndex: formStepIndexRef.current },
          },
          completionPercent: completion,
        },
      });
      setLastSaved(new Date());
    } catch (e) {
      console.warn("[draft] save failed", e);
    } finally {
      setDraftSaving(false);
    }
  }, [patientActivityId, isForm, config]);

  // Schedule auto-save on response change
  useEffect(() => {
    if (submitted || Object.keys(responses).length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraftNow();
    }, 3000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [responses, submitted, saveDraftNow]);

  // ── Close handling ──────────────────────────────────────────────
  const handleCloseAttempt = useCallback(() => {
    if (submitted || !hasAnyResponse) {
      onClose();
      return;
    }
    setShowCloseConfirm(true);
  }, [submitted, hasAnyResponse, onClose]);

  const handleConfirmClose = useCallback(async () => {
    // Save draft before closing
    await saveDraftNow();
    toast.success("Rascunho salvo.", { duration: 2000 });
    setShowCloseConfirm(false);
    onClose();
  }, [saveDraftNow, onClose]);

  const handleDiscardClose = useCallback(() => {
    deleteInSessionDraft({ data: { patientActivityId } }).catch(() => {});
    setShowCloseConfirm(false);
    onClose();
  }, [patientActivityId, onClose]);

  const [savingAndExiting, setSavingAndExiting] = useState(false);
  const handleSaveAndExit = useCallback(async (e?: MouseEvent) => {
    e?.stopPropagation();
    setSavingAndExiting(true);
    await saveDraftNow();
    setSavingAndExiting(false);
    toast.success("Rascunho salvo. Você pode continuar depois.", { duration: 3000 });
    onClose();
  }, [saveDraftNow, onClose]);

  // ── Submit ──────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: () =>
      recordInSessionResponse({
        data: { patientActivityId, responses },
      }),
    onSuccess: (res) => {
      setSubmitted(true);
      // Delete draft after successful submit
      deleteInSessionDraft({ data: { patientActivityId } }).catch(() => {});
      qc.invalidateQueries({
        queryKey: ["patient-activities", patientId, workspaceId],
      });
      if (res.clinicalFlag?.raised) {
        toast.warning(
          `⚠️ Flag clínica detectada: ${typeof res.clinicalFlag.flag === "string" ? res.clinicalFlag.flag.replace(/_/g, " ") : "sinal clínico"}`,
          { duration: 10_000 },
        );
      }
    },
    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível registrar.",
      );
    },
  });

  // Error — show immediately, skip vinheta
  if (configQuery.isError) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--cream)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="text-foreground">
            {configQuery.error instanceof Error
              ? configQuery.error.message
              : "Não foi possível carregar a atividade."}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-[var(--sage)] text-white text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[var(--cream)]">
        {/* Phase: Activity Player */}
        {introStarted && !submitted && (
          <div className="absolute inset-0 bg-background flex flex-col animate-in fade-in duration-300">
            <header className="flex items-center justify-between px-6 py-3 border-b border-border/50">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-lg text-foreground truncate">{activityTitle}</h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Aplicação em sessão · Passe o dispositivo ao paciente ou registre junto.
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                {/* Save & exit — prominent Navy button */}
                {hasAnyResponse && (
                  <button
                    onClick={handleSaveAndExit}
                    disabled={savingAndExiting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--navy)] text-white text-sm font-medium hover:bg-[var(--navy)]/90 transition-colors shadow-sm disabled:opacity-60"
                  >
                    <LogOut className="w-4 h-4" />
                    {savingAndExiting ? "Salvando…" : "Salvar e sair"}
                  </button>
                )}
                {/* Auto-save indicator */}
                {lastSaved && !savingAndExiting && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--sage)]">
                    <Save className="w-3 h-3" />
                    Salvo
                  </span>
                )}
                {draftSaving && !savingAndExiting && (
                  <span className="hidden sm:inline-flex text-xs text-muted-foreground">Salvando…</span>
                )}
                <button
                  onClick={handleCloseAttempt}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </header>

            {/* Draft restored banner */}
            {draftRestored && (
              <div className="px-6 py-2 bg-[var(--sage)]/10 border-b border-[var(--sage)]/20 flex items-center gap-2">
                <Save className="w-4 h-4 text-[var(--sage)]" />
                <span className="text-sm text-[var(--sage)]">
                  Rascunho anterior restaurado. Continue de onde parou.
                </span>
                <button
                  onClick={() => setDraftRestored(false)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
              {isForm ? (
                <FormRunner
                  config={config}
                  responses={responses}
                    currentStepIndex={formStepIndex}
                    onStepChange={setFormStepIndex}
                  onResponse={(fId, val) =>
                    setResponses((prev) => ({ ...prev, [fId]: val }))
                  }
                  onSubmit={() => submitMutation.mutate()}
                  submitting={submitMutation.isPending}
                  submitLabel="Registrar respostas"
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
                  submitLabel="Registrar respostas"
                />
              )}
            </div>
          </div>
        )}

        {/* Phase: Submitted — warm thank-you */}
        {submitted && (
          <div className="absolute inset-0 bg-[var(--cream)] flex flex-col animate-in fade-in duration-500">
            <header className="flex items-center justify-end px-6 py-4">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--sage)]/10 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-[10%] md:px-[20%] text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--sage)]/15 flex items-center justify-center animate-in zoom-in-50 duration-500">
                <svg
                  className="w-8 h-8 text-[var(--sage)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    className="animate-in slide-in-from-left-1 duration-500 delay-200"
                  />
                </svg>
              </div>

              <h2 className="font-display text-2xl md:text-3xl text-[var(--navy)] animate-in fade-in duration-500 delay-300">
                Pronto.
              </h2>

              <div className="space-y-2 animate-in fade-in duration-500 delay-500">
                <p className="text-[var(--charcoal)] text-base leading-relaxed">
                  Obrigado por responder com atenção.
                </p>
                <p className="text-[var(--charcoal)] text-base leading-relaxed">
                  Suas respostas foram registradas com segurança e já estão disponíveis para o seu terapeuta.
                </p>
              </div>

              <p className="text-[var(--sage)] text-sm animate-in fade-in duration-500 delay-700">
                Você pode fechar esta página com segurança.
              </p>

              <button
                onClick={onClose}
                className="mt-2 px-8 py-3 rounded-xl bg-[var(--sage)] text-white text-sm font-medium hover:bg-[var(--sage)]/90 transition-colors shadow-sm animate-in fade-in duration-500 delay-700"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Phase: Loading */}
        {configQuery.isLoading && (
          <div className="absolute inset-0 bg-[var(--cream)] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando atividade…</p>
          </div>
        )}

        {/* Phase: Scale Intro */}
        {vinhetaDone && !introStarted && !configQuery.isLoading && (
          <div className="absolute inset-0 bg-[var(--cream)] animate-in fade-in duration-300">
            <ScaleIntro
              title={activityTitle}
              config={config}
              onStart={() => setIntroStarted(true)}
            />
          </div>
        )}

        {/* Phase: Vinheta */}
        {!vinhetaDone && (
          <div className="absolute inset-0 bg-[var(--cream)]">
            <VinhetaIntro onComplete={handleVinhetaComplete} />
          </div>
        )}
      </div>

      {/* Close confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="z-[60]">
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem respostas em andamento. Deseja salvar um rascunho para continuar depois ou descartar o progresso?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>
              Continuar respondendo
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              className="bg-[var(--sage)] hover:bg-[var(--sage)]/90"
            >
              Salvar rascunho e sair
            </AlertDialogAction>
            <button
              onClick={handleDiscardClose}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors px-4 py-2"
            >
              Descartar e sair
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
