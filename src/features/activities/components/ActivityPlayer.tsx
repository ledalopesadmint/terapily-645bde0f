/**
 * ActivityPlayer — quiz premium slide-a-slide.
 *
 * Modo apresentação: uma pergunta por vez, navegação prev/next,
 * barra de progresso visual, feedback imediato por opção selecionada,
 * transição suave entre slides. Cara Terapily, não Google Forms.
 *
 * Reutilizado em:
 *  - /p/$token (magic link público)
 *  - In-session modal no /patients/$id
 */

import { useCallback, useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

export interface QuizQuestion {
  id: string;
  text: string;
  options: { value: number; label: string }[];
}

export interface QuizConfig {
  introduction?: string;
  questions?: QuizQuestion[];
  scoring?: { questions?: { id: string }[] };
}

interface ActivityPlayerProps {
  config: QuizConfig;
  responses: Record<string, number>;
  onResponse: (questionId: string, value: number) => void;
  /** Hide question numbers */
  hideNumbers?: boolean;
  /** Called when user clicks "Submit" on the last slide */
  onSubmit?: () => void;
  /** Whether submit is in progress */
  submitting?: boolean;
  /** Whether all questions must be answered to submit */
  submitDisabled?: boolean;
  /** Custom submit label */
  submitLabel?: string;
}

export function ActivityPlayer({
  config,
  responses,
  onResponse,
  hideNumbers,
  onSubmit,
  submitting,
  submitDisabled,
  submitLabel = "Enviar respostas",
}: ActivityPlayerProps) {
  const questions = useMemo<QuizQuestion[]>(
    () => (Array.isArray(config?.questions) ? config.questions : []),
    [config],
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  // When responses change externally (e.g. draft restore), jump to the right question
  const prevResponseCountRef = useRef(Object.keys(responses).length);
  useEffect(() => {
    const prevCount = prevResponseCountRef.current;
    const currentCount = Object.keys(responses).length;
    prevResponseCountRef.current = currentCount;
    // Only jump when going from 0 responses to many (draft restore)
    if (prevCount === 0 && currentCount > 0 && questions.length > 0) {
      const firstUnanswered = questions.findIndex((q) => responses[q.id] === undefined);
      const targetIdx = firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
      setCurrentIdx(targetIdx);
    }
  }, [responses, questions]);

  const total = questions.length;
  const question = questions[currentIdx];
  const selectedValue = question ? responses[question.id] : undefined;
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === total - 1;
  const { answered, completion, allAnswered } = getCompletionStats(config, responses);

  // Auto-advance after selecting an option (small delay for feedback)
  const handleSelect = useCallback(
    (questionId: string, value: number) => {
      onResponse(questionId, value);
      // Auto-advance to next question after 400ms
      if (!isLast) {
        setTimeout(() => {
          setDirection("next");
          setAnimating(true);
          setTimeout(() => {
            setCurrentIdx((i) => Math.min(i + 1, total - 1));
            setAnimating(false);
          }, 200);
        }, 400);
      }
    },
    [onResponse, isLast, total],
  );

  const goTo = useCallback(
    (dir: "prev" | "next") => {
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrentIdx((i) =>
          dir === "next" ? Math.min(i + 1, total - 1) : Math.max(i - 1, 0),
        );
        setAnimating(false);
      }, 200);
    },
    [total],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !isFirst) goTo("prev");
      if (e.key === "ArrowRight" && !isLast && selectedValue !== undefined) goTo("next");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo, isFirst, isLast, selectedValue]);

  if (total === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Esta atividade ainda não está pronta para resposta automática. Fale com
        sua terapeuta.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-4 px-6">
        {questions.map((q, i) => {
          const isAnswered = responses[q.id] !== undefined;
          const isCurrent = i === currentIdx;
          return (
            <button
              key={q.id}
              onClick={() => {
                setDirection(i > currentIdx ? "next" : "prev");
                setAnimating(true);
                setTimeout(() => {
                  setCurrentIdx(i);
                  setAnimating(false);
                }, 200);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isCurrent
                  ? "w-8 bg-[var(--sage)]"
                  : isAnswered
                    ? "w-2 bg-[var(--sage)]/60"
                    : "w-2 bg-border",
              )}
              aria-label={`Pergunta ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Counter */}
      <div className="text-center">
        <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          {currentIdx + 1} de {total}
        </span>
      </div>

      {/* Question slide */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
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
          {question && (
            <>
              {/* Question text */}
              <h2 className="font-display text-xl md:text-2xl text-foreground text-center leading-snug mb-8">
                {hideNumbers ? "" : (
                  <span className="text-[var(--sage)] mr-1.5">{currentIdx + 1}.</span>
                )}
                {question.text}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((opt) => {
                  const isSelected = selectedValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(question.id, opt.value)}
                      className={cn(
                        "w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200",
                        "flex items-center gap-4 group",
                        "hover:shadow-md hover:border-[var(--sage)]/60",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sage)]",
                        isSelected
                          ? "border-[var(--sage)] bg-[var(--sage)]/10 shadow-sm"
                          : "border-border bg-card hover:bg-[var(--sage)]/5",
                      )}
                    >
                      {/* Radio circle */}
                      <span
                        className={cn(
                          "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                          isSelected
                            ? "border-[var(--sage)] bg-[var(--sage)]"
                            : "border-muted-foreground/30 group-hover:border-[var(--sage)]/60",
                        )}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        )}
                      </span>

                      {/* Label */}
                      <span
                        className={cn(
                          "text-sm md:text-base transition-colors",
                          isSelected
                            ? "text-foreground font-medium"
                            : "text-foreground/80",
                        )}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between px-6 py-5 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <button
          onClick={() => goTo("prev")}
          disabled={isFirst}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            isFirst
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-foreground hover:bg-[var(--sage)]/10",
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        {/* Mini progress text */}
        <span className="text-xs text-muted-foreground">
          {answered} de {total} respondidas
        </span>

        {isLast ? (
          <button
            onClick={onSubmit}
            disabled={submitDisabled !== undefined ? submitDisabled : (!allAnswered || submitting)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all",
              (submitDisabled ?? !allAnswered) || submitting
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[var(--sage)] text-white hover:bg-[var(--sage)]/90 shadow-sm",
            )}
          >
            {submitting ? "Enviando…" : submitLabel}
          </button>
        ) : (
          <button
            onClick={() => goTo("next")}
            disabled={selectedValue === undefined}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              selectedValue === undefined
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-foreground hover:bg-[var(--sage)]/10",
            )}
          >
            Próxima
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Utility: count answered and total from config */
export function getCompletionStats(
  config: QuizConfig,
  responses: Record<string, number>,
) {
  const total = Array.isArray(config?.questions) ? config.questions.length : 0;
  const answered = Object.keys(responses).length;
  const completion = total === 0 ? 0 : Math.round((answered / total) * 100);
  const allAnswered = total > 0 && answered === total;
  return { total, answered, completion, allAnswered };
}
