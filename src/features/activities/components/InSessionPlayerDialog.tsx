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
import { cn } from "@/lib/utils";

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
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [introStarted, setIntroStarted] = useState(false);
  const handleVinhetaComplete = useCallback(() => {
    setVinhetaDone(true);
    // Keep cream overlay for a smooth fade-out (no flash)
    setTimeout(() => setOverlayVisible(false), 500);
  }, []);

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
          `⚠️ Flag clínica detectada: ${res.clinicalFlag.flag}`,
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
      <FullscreenShell title={activityTitle} onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
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
      </FullscreenShell>
    );
  }

  // Vinheta intro (plays before any content)
  if (!vinhetaDone) {
    return <VinhetaIntro onComplete={handleVinhetaComplete} />;
  }

  // Scale intro page (after vinheta, before questions)
  if (!introStarted && !configQuery.isLoading) {
    return (
      <ScaleIntro
        title={activityTitle}
        config={config}
        onStart={() => setIntroStarted(true)}
      />
    );
  }

  // Loading
  if (configQuery.isLoading) {
    return (
      <FullscreenShell title={activityTitle} onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Carregando atividade…</p>
        </div>
      </FullscreenShell>
    );
  }


  // Submitted
  if (submitted) {
    const result = submitMutation.data;
    return (
      <FullscreenShell title={activityTitle} onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--sage)]/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--sage)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-foreground">Atividade registrada</h2>
          {result?.score != null && (
            <p className="text-lg text-foreground">
              Score: <strong>{result.score}</strong>
              {result.severity && result.severity !== "not_applicable" && (
                <span className="text-muted-foreground"> · {result.severity}</span>
              )}
            </p>
          )}
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2.5 rounded-lg bg-[var(--sage)] text-white text-sm font-medium hover:bg-[var(--sage)]/90 transition-colors"
          >
            Fechar
          </button>
        </div>
      </FullscreenShell>
    );
  }

  return (
    <FullscreenShell title={activityTitle} onClose={onClose} subtitle="Aplicação em sessão · Passe o dispositivo ao paciente ou registre junto.">
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
    </FullscreenShell>
  );
}

/** Fullscreen overlay shell for the player */
function FullscreenShell({
  children,
  title,
  subtitle,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
