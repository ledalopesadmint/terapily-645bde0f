/**
 * EphemeralCountdownBadge — Badge com countdown regressivo para atividades efêmeras.
 *
 * Mostra tempo restante até a purga dos dados (24h após submit).
 * Escala de cores:
 *  - >12h: sage (informativo)
 *  - 2h–12h: âmbar (atenção)
 *  - <2h: coral (urgência, com pulse)
 *  - ≤0: cinza (expirado)
 *
 * Integra botão de download de PDF e registra audit no primeiro render.
 */

import { useEffect, useRef, useState } from "react";
import { Clock, Download, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EphemeralCountdownBadgeProps {
  purgeAfter: string; // ISO timestamp
  activityTitle: string;
  onDownloadPdf: () => void;
  onWarningShown?: () => void;
  isPdfBusy?: boolean;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((ms % (1000 * 60)) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type UrgencyPhase = "safe" | "attention" | "urgent" | "expired";

function getPhase(msLeft: number): UrgencyPhase {
  if (msLeft <= 0) return "expired";
  if (msLeft < 2 * 60 * 60 * 1000) return "urgent"; // <2h
  if (msLeft < 12 * 60 * 60 * 1000) return "attention"; // <12h
  return "safe"; // >12h
}

const PHASE_STYLES: Record<UrgencyPhase, string> = {
  safe: "border-[color:var(--sage)] bg-[color:oklch(0.94_0.03_155)] text-[color:oklch(0.35_0.08_155)]",
  attention: "border-amber-400 bg-amber-50 text-amber-800",
  urgent: "border-[color:var(--action-flag)] bg-[color:var(--action-flag-subtle)] text-[color:var(--action-flag)] animate-pulse",
  expired: "border-gray-300 bg-gray-100 text-gray-500",
};

export function EphemeralCountdownBadge({
  purgeAfter,
  activityTitle,
  onDownloadPdf,
  onWarningShown,
  isPdfBusy = false,
}: EphemeralCountdownBadgeProps) {
  const [msLeft, setMsLeft] = useState(() => {
    return new Date(purgeAfter).getTime() - Date.now();
  });

  const warningFired = useRef(false);
  const oneHourToastFired = useRef(false);
  const auditFired = useRef(false);

  // Countdown interval
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(purgeAfter).getTime() - Date.now();
      setMsLeft(remaining);

      // Toast at 1h remaining (once)
      if (remaining > 0 && remaining < 60 * 60 * 1000 && !oneHourToastFired.current) {
        oneHourToastFired.current = true;
        toast.warning(
          `${activityTitle} expira em menos de 1h — baixe o PDF agora`,
          { duration: 10000 },
        );
      }

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [purgeAfter, activityTitle]);

  // Audit: warning shown (once per mount)
  useEffect(() => {
    if (!auditFired.current && onWarningShown) {
      auditFired.current = true;
      onWarningShown();
    }
  }, [onWarningShown]);

  const phase = getPhase(msLeft);
  const isExpired = phase === "expired";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold shadow-sm transition-all ${PHASE_STYLES[phase]}`}
          >
            {isExpired ? (
              <Lock className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {isExpired
                ? "Dados expirados"
                : `Dados expiram em: ${formatTimeLeft(msLeft)}`}
            </span>
            <Button
              size="sm"
              variant={isExpired ? "ghost" : "outline"}
              disabled={isExpired || isPdfBusy}
              onClick={(e) => {
                e.stopPropagation();
                onDownloadPdf();
              }}
              className="ml-1 h-6 px-2 text-[10px]"
            >
              <Download className="mr-1 h-3 w-3" />
              {isPdfBusy ? "..." : "PDF"}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px] text-xs">
          {isExpired
            ? "Os dados desta atividade foram permanentemente removidos."
            : "Após a expiração, os dados desta atividade serão permanentemente removidos e não poderão ser recuperados."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
