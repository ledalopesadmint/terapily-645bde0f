/**
 * Banner discreto que aparece quando o terapeuta usa ≥80% das vagas.
 * Linguagem cordial e direta, sem pressão.
 */
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  used: number;
  max: number;
  tier: string; // "solo" | "basic" | "practice" | etc
  onJoinWaitlist: () => void;
}

export function PatientLimitBanner({ used, max, tier, onJoinWaitlist }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const ratio = used / max;
  if (dismissed || ratio < 0.8) return null;

  const isPractice = tier === "practice";
  const atLimit = used >= max;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-mauve/30 bg-mauve/5 px-4 py-3">
      <div className="flex-1 text-sm">
        <p className="text-foreground">
          Você cadastrou <strong>{used} de {max} pacientes</strong> do plano{" "}
          {isPractice ? "Practice" : "Basic"}.{" "}
          {isPractice ? (
            <>
              {atLimit ? (
                <>
                  Estamos finalizando o plano <strong>Clinic</strong> (100+ pacientes).{" "}
                  Quer entrar na lista de espera pra ser avisado primeiro?
                </>
              ) : (
                <>
                  Estamos finalizando o plano <strong>Clinic</strong> (100+ pacientes) —{" "}
                  quer entrar na lista de espera?
                </>
              )}
            </>
          ) : (
            <>
              Quando bater no limite, você precisará excluir alguém ou fazer upgrade pro{" "}
              <strong>Practice</strong> (50 vagas).
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isPractice ? (
            <Button size="sm" variant="outline" onClick={onJoinWaitlist}>
              Entrar na lista
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/settings/billing">Ver Practice</Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Lembrar depois
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
