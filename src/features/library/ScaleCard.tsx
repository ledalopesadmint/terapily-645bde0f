/**
 * ScaleCard — card editorial para escalas validadas.
 *
 * Mesmo estilo visual do ActivityCard: ilustração SVG no topo,
 * chip de metadados, título Cormorant, descrição truncada, CTA hover.
 * Reutilizado no Acervo (InSessionQuickAccess) e em /scales.
 */

import { useState } from "react";
import { Play, Send, Info } from "lucide-react";
import { ActivityIllustration } from "./illustrations";
import type { Activity } from "./library.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Mapeia category da escala → ilustração do acervo */
const CATEGORY_ILLUSTRATION: Record<string, Activity["illustration"]> = {
  depression: "petals",
  anxiety: "tide",
  trauma: "anchor",
  substance_use: "scattered",
  ocd: "lattice",
  eating: "compass",
  sleep: "horizon",
  wellbeing: "spiral",
  cbt: "lattice",
  act: "spiral",
};

export function getScaleIllustration(category: string): Activity["illustration"] {
  return CATEGORY_ILLUSTRATION[category] ?? "petals";
}

interface ScaleCardProps {
  code: string;
  name: string;
  category: string;
  durationMin: number;
  shortDescription?: string;
  illustration: Activity["illustration"];
  isExclusive?: boolean;
  /** Custom chip label (defaults to "Escala validada"). */
  chipLabel?: string;
  supportsMagicLink?: boolean;
  onClick?: () => void;
  onSendLink?: () => void;
}

export function ScaleCard({
  code,
  name,
  category,
  durationMin,
  shortDescription,
  illustration,
  isExclusive,
  supportsMagicLink,
  onClick,
  onSendLink,
}: ScaleCardProps) {
  const titleId = `scale-${code}-title`;
  const [showExclusiveInfo, setShowExclusiveInfo] = useState(false);

  return (
    <>
      <article
        aria-labelledby={titleId}
        className="
          group relative isolate flex h-full flex-col overflow-hidden rounded-xl
          border border-border/60 bg-card text-left
          transition-all duration-300 ease-out
          hover:-translate-y-1 hover:scale-[1.02]
          hover:border-[var(--sage)]/50
          hover:shadow-[0_14px_32px_-14px_var(--activity-glow)]
        "
      >
        {/* Faixa hairline no topo */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 z-10 h-[3px] bg-[var(--sage)] opacity-60"
        />

        {/* Ilustração SVG — área visual dominante */}
        <div className="relative aspect-[10/7] w-full overflow-hidden bg-[var(--cream)]">
          <ActivityIllustration
            id={illustration}
            className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
          {isExclusive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowExclusiveInfo(true);
              }}
              className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-[var(--navy)] backdrop-blur-sm transition-colors hover:bg-card"
            >
              Só em sessão
              <Info className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
          {/* Chip code · duração */}
          <div className="flex items-center gap-2 text-[0.6875rem] font-medium tracking-wide">
            <span className="text-secondary-foreground/90">Escala validada</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-mauve" />
            <span className="text-muted-foreground">{durationMin} min</span>
          </div>

          {/* Título */}
          <h3
            id={titleId}
            className="font-display text-lg leading-tight text-foreground"
          >
            {name}
          </h3>

          {/* Descrição */}
          {shortDescription && (
            <p className="line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground/90">
              {shortDescription}
            </p>
          )}

          {/* CTAs — revelados no hover */}
          <div className="
            mt-auto flex gap-2 pt-2
            opacity-0 translate-y-1 transition-all duration-300
            group-hover:opacity-100 group-hover:translate-y-0
            group-focus-within:opacity-100 group-focus-within:translate-y-0
          ">
            <button
              type="button"
              onClick={onClick}
              className="
                inline-flex flex-1 items-center justify-center gap-1.5 rounded-md
                bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground
                transition-colors hover:bg-primary/90
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              "
            >
              <Play className="h-3 w-3" aria-hidden />
              Em sessão
            </button>
            {supportsMagicLink && (
              <button
                type="button"
                onClick={onSendLink}
                className="
                  inline-flex flex-1 items-center justify-center gap-1.5 rounded-md
                  border border-primary/30 bg-card px-3 py-1.5 text-xs font-medium text-primary
                  transition-colors hover:bg-primary/10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                "
              >
                <Send className="h-3 w-3" aria-hidden />
                Enviar link
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Modal de explicação — escalas exclusivas em sessão */}
      <Dialog open={showExclusiveInfo} onOpenChange={setShowExclusiveInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Por que só em sessão?
            </DialogTitle>
            <DialogDescription className="sr-only">
              Explicação sobre restrição de envio por link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
            <p>
              <strong>{name}</strong> contém itens que podem indicar
              risco clínico imediato — como ideação suicida, autolesão ou
              descompensação aguda.
            </p>
            <p>
              Quando um paciente responde a esses itens, a presença do
              terapeuta é essencial para avaliar a situação, acolher e, se
              necessário, intervir no momento.
            </p>
            <p>
              Por segurança clínica, esta escala só pode ser aplicada durante
              a sessão, com o paciente respondendo no dispositivo do terapeuta.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Essa restrição segue diretrizes de manejo de risco e não pode
              ser alterada.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
