/**
 * ScaleIntro — tela de introdução da escala, exibida entre a vinheta e as perguntas.
 * Mostra metadados simples da escala e um botão "Iniciar" que demarca o início.
 */

import { ClipboardList, Clock, BarChart3 } from "lucide-react";
import type { QuizConfig } from "./ActivityPlayer";

interface ScaleIntroProps {
  title: string;
  config: QuizConfig;
  onStart: () => void;
}

export function ScaleIntro({ title, config, onStart }: ScaleIntroProps) {
  const questionCount = config.questions?.length ?? 0;
  const estimatedMin = questionCount > 0 ? Math.max(2, Math.ceil(questionCount * 0.4)) : 3;
  const hasIntroduction = !!config.introduction;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--cream)] flex flex-col animate-in fade-in duration-300">
      {/* Content centered */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--navy)]/8">
            <ClipboardList className="h-8 w-8 text-[var(--navy)]" aria-hidden />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="font-display text-3xl text-[var(--navy)] sm:text-4xl leading-tight">
              {title}
            </h1>
            {hasIntroduction && (
              <div className="text-sm text-[var(--charcoal)]/70 leading-relaxed max-w-sm mx-auto space-y-3 text-left">
                {config.introduction!.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>

          {/* Metadata chips */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {questionCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-[var(--navy)]/6 px-3.5 py-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-[var(--navy)]/60" />
                <span className="text-xs font-medium text-[var(--navy)]/80">
                  {questionCount} {questionCount === 1 ? "item" : "itens"}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--navy)]/6 px-3.5 py-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--navy)]/60" />
              <span className="text-xs font-medium text-[var(--navy)]/80">
                ~{estimatedMin} min
              </span>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={onStart}
            className="
              mx-auto flex items-center gap-2 rounded-xl
              bg-[var(--sage)] px-8 py-3.5
              text-sm font-semibold text-white tracking-wide
              transition-all duration-200
              hover:bg-[var(--sage)]/90 hover:shadow-lg hover:shadow-[var(--sage)]/20
              active:scale-[0.98]
            "
          >
            Iniciar
          </button>

          <p className="text-[0.6875rem] text-[var(--charcoal)]/40">
            O tempo será registrado a partir do clique.
          </p>
        </div>
      </div>
    </div>
  );
}
