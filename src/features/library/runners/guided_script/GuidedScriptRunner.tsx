/**
 * GuidedScriptRunner — step-by-step therapeutic script player.
 *
 * Each step shows an instruction (read by patient or therapist),
 * an optional countdown timer, and an optional reflection text area.
 * Progresses one step at a time with smooth transitions.
 *
 * Used for: 5-4-3-2-1 Grounding, Safe Place, Leaves on a Stream, etc.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check, Timer, Pause, Play } from "lucide-react";
import type { GuidedScriptConfig, GuidedScriptResponses } from "./script-types";

interface GuidedScriptRunnerProps {
  config: GuidedScriptConfig;
  responses: Record<string, unknown>;
  onResponse: (stepId: string, value: string) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function GuidedScriptRunner({
  config,
  responses,
  onResponse,
  onSubmit,
  submitting,
  submitLabel = "Concluir exercício",
}: GuidedScriptRunnerProps) {
  const steps = config.steps ?? [];
  const total = steps.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = steps[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === total - 1;

  // Count completed steps
  const completedCount = steps.filter((s) => {
    const val = responses[s.id];
    return val !== undefined && val !== "";
  }).length;
  const allCompleted = completedCount === total;

  // Timer logic
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    // Reset timer when step changes
    setTimerActive(false);
    setTimerRemaining(step?.durationSec ?? 0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [currentIdx, step?.durationSec]);

  const toggleTimer = useCallback(() => {
    if (timerActive) {
      // Pause
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setTimerActive(false);
    } else {
      // Start
      setTimerActive(true);
      timerRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [timerActive]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const markComplete = useCallback(() => {
    if (!step) return;
    if (!step.hasReflection && !responses[step.id]) {
      onResponse(step.id, "completed");
    }
  }, [step, responses, onResponse]);

  const goTo = useCallback(
    (dir: "prev" | "next") => {
      // Mark current step as complete when going next (for non-reflection steps)
      if (dir === "next" && step && !step.hasReflection && !responses[step.id]) {
        onResponse(step.id, "completed");
      }
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrentIdx((i) =>
          dir === "next" ? Math.min(i + 1, total - 1) : Math.max(i - 1, 0),
        );
        setAnimating(false);
      }, 200);
    },
    [total, step, responses, onResponse],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !isFirst) goTo("prev");
      if (e.key === "ArrowRight" && !isLast) goTo("next");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo, isFirst, isLast]);

  if (total === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Esta atividade ainda não possui um roteiro configurado.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-4 px-6">
        {steps.map((s, i) => {
          const isDone = responses[s.id] !== undefined && responses[s.id] !== "";
          const isCurrent = i === currentIdx;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (i !== currentIdx) {
                  markComplete();
                  setDirection(i > currentIdx ? "next" : "prev");
                  setAnimating(true);
                  setTimeout(() => {
                    setCurrentIdx(i);
                    setAnimating(false);
                  }, 200);
                }
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isCurrent
                  ? "w-8 bg-[var(--sage)]"
                  : isDone
                    ? "w-2 bg-[var(--sage)]/60"
                    : "w-2 bg-border",
              )}
              aria-label={`Passo ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Counter */}
      <div className="text-center">
        <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Passo {currentIdx + 1} de {total}
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <div
          className={cn(
            "w-full max-w-lg transition-all duration-200",
            animating
              ? direction === "next"
                ? "opacity-0 translate-x-8"
                : "opacity-0 -translate-x-8"
              : "opacity-100 translate-x-0",
          )}
        >
          {step && (
            <div className="flex flex-col items-center gap-6">
              {/* Step title */}
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--sage)]">
                {step.title}
              </p>

              {/* Instruction */}
              <h2 className="font-display text-xl md:text-2xl text-foreground text-center leading-relaxed">
                {step.instruction}
              </h2>

              {/* Timer */}
              {step.durationSec && step.durationSec > 0 && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleTimer}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation",
                        timerActive
                          ? "bg-[var(--sage)]/15 text-[var(--sage)] hover:bg-[var(--sage)]/25"
                          : "bg-[var(--sage)] text-white hover:bg-[var(--sage)]/90 shadow-sm",
                      )}
                    >
                      {timerActive ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pausar
                        </>
                      ) : timerRemaining === 0 && step.durationSec ? (
                        <>
                          <Timer className="w-4 h-4" />
                          Reiniciar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Iniciar timer
                        </>
                      )}
                    </button>
                  </div>
                  <span
                    className={cn(
                      "text-3xl font-mono tabular-nums transition-colors",
                      timerActive ? "text-[var(--sage)]" : "text-muted-foreground",
                      timerRemaining === 0 && "text-[var(--sage)] font-bold",
                    )}
                  >
                    {timerRemaining === 0 && !timerActive ? "✓" : formatTime(timerRemaining)}
                  </span>
                </div>
              )}

              {/* Reflection */}
              {step.hasReflection && (
                <div className="w-full space-y-2">
                  {step.reflectionLabel && (
                    <label className="text-sm font-medium text-foreground">
                      {step.reflectionLabel}
                    </label>
                  )}
                  <textarea
                    value={(responses[step.id] as string) ?? ""}
                    onChange={(e) => onResponse(step.id, e.target.value)}
                    placeholder={step.reflectionPlaceholder ?? "Escreva aqui..."}
                    rows={4}
                    className={cn(
                      "w-full rounded-xl border-2 border-border bg-card px-4 py-3",
                      "text-sm text-foreground placeholder:text-muted-foreground/50",
                      "resize-none transition-colors",
                      "focus:outline-none focus:border-[var(--sage)] focus:ring-1 focus:ring-[var(--sage)]/30",
                    )}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-4 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <button
          onClick={() => goTo("prev")}
          disabled={isFirst}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation",
            isFirst
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-foreground hover:bg-[var(--sage)]/10 active:bg-[var(--sage)]/20",
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        <span className="text-[11px] sm:text-xs text-muted-foreground text-center">
          {completedCount} de {total} passos
        </span>

        {isLast ? (
          <button
            onClick={() => {
              markComplete();
              onSubmit?.();
            }}
            disabled={submitting}
            className={cn(
              "flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation min-h-[44px]",
              submitting
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[var(--sage)] text-white hover:bg-[var(--sage)]/90 active:bg-[var(--sage)]/80 shadow-sm",
            )}
          >
            {submitting ? "Registrando…" : submitLabel}
          </button>
        ) : (
          <button
            onClick={() => goTo("next")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation text-foreground hover:bg-[var(--sage)]/10 active:bg-[var(--sage)]/20"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Utility: get completion stats for a guided script */
export function getScriptCompletion(
  config: GuidedScriptConfig,
  responses: Record<string, unknown>,
) {
  const steps = config.steps ?? [];
  const total = steps.length;
  const completed = steps.filter((s) => {
    const val = responses[s.id];
    return val !== undefined && val !== "";
  }).length;
  const completion = total === 0 ? 0 : Math.round((completed / total) * 100);
  const allAnswered = total > 0 && completed >= total;
  return { total, completed, completion, allAnswered };
}
