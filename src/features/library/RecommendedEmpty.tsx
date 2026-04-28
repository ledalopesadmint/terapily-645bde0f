/**
 * RecommendedEmpty — estado vazio honesto pra "Recomendados pra você".
 *
 * Mantém o ritmo visual da referência (não esconde a seção) sem fingir dados.
 * Em S3, quando `activity_reports` existir, vira um carrossel real baseado
 * em histórico de uso da terapeuta + perfis dos pacientes ativos.
 */

import { Sparkles } from "lucide-react";

export function RecommendedEmpty() {
  return (
    <section aria-labelledby="rec-title" className="px-4 sm:px-8">
      <header className="mb-4">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-terracotta">
          Recomendado pra você
        </p>
        <h2
          id="rec-title"
          className="mt-2 font-display text-2xl text-foreground sm:text-3xl"
        >
          Baseado nas suas sessões recentes
        </h2>
      </header>

      <div
        className="
          flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-card/50 p-6
          sm:flex-row sm:items-center sm:gap-6 sm:p-8
        "
      >
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sage/15 text-sage"
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-display text-xl text-foreground">
            Suas recomendações vão aparecer aqui.
          </p>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Assim que você começar a aplicar ferramentas com pacientes, o
            Terapily sugere o que faz sentido pra cada perfil. Disponível na
            Semana 3.
          </p>
        </div>
        <span className="rounded-full border border-border bg-cream px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          S3
        </span>
      </div>
    </section>
  );
}
