/**
 * In-session player modal — terapeuta aplica atividade ao vivo.
 * Fullscreen presentation mode com o ActivityPlayer slide-a-slide.
 */

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { VinhetaIntro } from "./VinhetaIntro";
import { ScaleIntro } from "./ScaleIntro";

import {
  ActivityPlayer,
  getCompletionStats,
  type QuizConfig,
} from "./ActivityPlayer";
import {
  getActivityConfig,
  recordInSessionResponse,
} from "@/features/activities/activities.functions";


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
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [vinhetaDone, setVinhetaDone] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const handleVinhetaComplete = useCallback(() => setVinhetaDone(true), []);

  const configQuery = useQuery({
    queryKey: ["activity-config", patientActivityId],
    queryFn: () =>
      getActivityConfig({ data: { patientActivityId } }),
    retry: false,
  });

  const config = (configQuery.data?.activity?.config ?? {}) as QuizConfig;
  const { allAnswered } = getCompletionStats(config, responses);

  const submitMutation = useMutation({
    mutationFn: () =>
      recordInSessionResponse({
        data: { patientActivityId, responses },
      }),
    onSuccess: (res) => {
      setSubmitted(true);
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

  // ── All phases render INSIDE a single persistent fullscreen container ──
  // This prevents any flash of the underlying page between phase transitions.

  return (
    <div className="fixed inset-0 z-50 bg-[var(--cream)]">
      {/* Phase: Activity Player (rendered underneath, always mounted when ready) */}
      {introStarted && !submitted && (
        <div className="absolute inset-0 bg-background flex flex-col animate-in fade-in duration-300">
          <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg text-foreground truncate">{activityTitle}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Aplicação em sessão · Passe o dispositivo ao paciente ou registre junto.
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </header>
          <div className="flex-1 flex flex-col overflow-hidden">
            <ActivityPlayer
              config={config}
              responses={responses}
              onResponse={(qId, val) =>
                setResponses((prev) => ({ ...prev, [qId]: val }))
              }
              onSubmit={() => submitMutation.mutate()}
              submitting={submitMutation.isPending}
              submitLabel="Registrar respostas"
            />
          </div>
        </div>
      )}

      {/* Phase: Submitted — warm thank-you */}
      {submitted && (
        <div className="absolute inset-0 bg-[var(--cream)] flex flex-col animate-in fade-in duration-500">
          {/* Minimal header with close */}
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
            {/* Animated check */}
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

            {/* Headline */}
            <h2 className="font-display text-2xl md:text-3xl text-[var(--navy)] animate-in fade-in duration-500 delay-300">
              Pronto.
            </h2>

            {/* Copy */}
            <div className="space-y-2 animate-in fade-in duration-500 delay-500">
              <p className="text-[var(--charcoal)] text-base leading-relaxed">
                Obrigado por responder com atenção.
              </p>
              <p className="text-[var(--charcoal)] text-base leading-relaxed">
                Suas respostas foram registradas com segurança e já estão disponíveis para o seu terapeuta.
              </p>
            </div>

            {/* Safety reassurance */}
            <p className="text-[var(--sage)] text-sm animate-in fade-in duration-500 delay-700">
              Você pode fechar esta página com segurança.
            </p>

            {/* Close button */}
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

      {/* Phase: Scale Intro (on top of player, cream background) */}
      {vinhetaDone && !introStarted && !configQuery.isLoading && (
        <div className="absolute inset-0 bg-[var(--cream)] animate-in fade-in duration-300">
          <ScaleIntro
            title={activityTitle}
            config={config}
            onStart={() => setIntroStarted(true)}
          />
        </div>
      )}

      {/* Phase: Vinheta (topmost layer, cream background) */}
      {!vinhetaDone && (
        <div className="absolute inset-0 bg-[var(--cream)]">
          <VinhetaIntro onComplete={handleVinhetaComplete} />
        </div>
      )}
    </div>
  );
}
