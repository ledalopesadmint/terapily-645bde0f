/**
 * ConsentGate — modal de consentimento obrigatório antes da atividade.
 *
 * Fluxo:
 *  - Paciente clica "Começar" na tela de intro → abre este modal.
 *  - Precisa ler o texto e clicar "Aceito" ou "Não aceito".
 *  - "Não aceito" → confirmação → decline registrado → link encerrado.
 *  - "Aceito" → consent registrado → atividade começa.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONSENT_TEXT_PT } from "@/features/activities/consent.functions";

type ConsentGateState = "reading" | "confirming_decline" | "submitting";

interface ConsentGateProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function ConsentGate({
  open,
  onAccept,
  onDecline,
  onClose,
  loading = false,
}: ConsentGateProps) {
  const [state, setState] = useState<ConsentGateState>("reading");

  const paragraphs = CONSENT_TEXT_PT.split("\n\n");

  if (state === "confirming_decline") {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Confirmar recusa
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Ao recusar, este link será encerrado e o(a) terapeuta será
              notificado(a). Nenhuma resposta será coletada. Tem certeza?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setState("reading")}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={onDecline}
              disabled={loading}
            >
              {loading ? "Registrando…" : "Sim, recusar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent
          className="max-h-[88dvh] w-[calc(100vw-2rem)] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[85dvh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 px-5 pb-3 pt-5 text-left sm:px-6 sm:pt-6">
          <DialogTitle className="font-display text-lg">
            Termos de privacidade e consentimento
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Leia atentamente antes de prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-2 [-webkit-overflow-scrolling:touch] sm:px-6">
          <div className="space-y-4 pb-4 pr-1">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-foreground/90"
              >
                {p}
              </p>
            ))}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/40 px-5 py-4 sm:gap-0 sm:px-6">
          <Button
            variant="outline"
            onClick={() => setState("confirming_decline")}
            disabled={loading}
            className="text-muted-foreground"
          >
            Não aceito
          </Button>
          <Button
            onClick={onAccept}
            disabled={loading}
            className="bg-[var(--sage)] hover:bg-[var(--sage)]/90 text-white"
          >
            {loading ? "Registrando…" : "Aceito e quero continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
