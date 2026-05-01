/**
 * ActivityPlayer — renderiza perguntas de uma escala (Likert / Yes-No)
 * a partir do config JSONB do activity_catalog.
 *
 * Reutilizado em:
 *  - /p/$token (magic link público)
 *  - In-session modal no /patients/$id
 *
 * Sem estado de autosave/submit — isso fica no caller.
 */

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  /** Hide question numbers (e.g. for compact views) */
  hideNumbers?: boolean;
}

export function ActivityPlayer({
  config,
  responses,
  onResponse,
  hideNumbers,
}: ActivityPlayerProps) {
  const questions = useMemo<QuizQuestion[]>(
    () => (Array.isArray(config?.questions) ? config.questions : []),
    [config],
  );

  if (questions.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Esta atividade ainda não está pronta para resposta automática. Fale com
        sua terapeuta.
      </div>
    );
  }

  return (
    <ol className="space-y-6">
      {questions.map((q, idx) => (
        <li key={q.id} className="rounded-lg border border-border bg-card p-5">
          <Label className="text-base font-medium text-foreground">
            {hideNumbers ? "" : `${idx + 1}. `}
            {q.text}
          </Label>
          <RadioGroup
            className="mt-4 space-y-2"
            value={responses[q.id]?.toString() ?? ""}
            onValueChange={(value) => onResponse(q.id, Number(value))}
          >
            {q.options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-3">
                <RadioGroupItem
                  id={`${q.id}-${opt.value}`}
                  value={opt.value.toString()}
                />
                <Label
                  htmlFor={`${q.id}-${opt.value}`}
                  className="cursor-pointer text-sm font-normal text-foreground"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </li>
      ))}
    </ol>
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
