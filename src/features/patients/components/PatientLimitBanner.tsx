/**
 * Banner que aparece quando o terapeuta usa ≥80% das vagas do plano.
 *
 * REGRA DE VAGA (alinhada com `enforce_patient_limit` + `assert_patient_capacity`):
 *   ocupada = paciente com `deleted_at IS NULL` (status active OU archived)
 *   livre    = excluído na lixeira (some em 30 dias via purge)
 *
 * O breakdown "X ativos + Y arquivados" deixa claro por que o limite bate
 * mesmo quando o terapeuta "só vê" 19 ativos. Sem isso, a percepção é
 * "tem vaga mas o sistema não deixa" — gera ticket e desconfiança.
 */
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  used: number;
  max: number;
  tier: string;
  active: number;
  archived: number;
  onJoinWaitlist: () => void;
}

export function PatientLimitBanner({
  used,
  max,
  tier,
  active,
  archived,
  onJoinWaitlist,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const ratio = used / max;
  if (dismissed || ratio < 0.8) return null;

  const isPractice = tier === "practice";
  const atLimit = used >= max;
  const remaining = Math.max(0, max - used);
  const showArchivedHint = archived > 0;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-mauve/30 bg-mauve/5 px-4 py-3">
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          {atLimit ? "Você atingiu o limite do seu plano." : "Você está chegando no limite do seu plano."}
        </p>

        {/* Breakdown: explica o que ocupa vaga */}
        <p className="mt-2 text-xs text-muted-foreground">
          <strong className="text-foreground">{used} de {max} vagas ocupadas</strong>
          {" — "}
          {active} {active === 1 ? "ativo" : "ativos"} + {archived}{" "}
          {archived === 1 ? "arquivado" : "arquivados"}.
          {" "}Pacientes arquivados ocupam vaga porque os dados continuam
          guardados com segurança. Excluídos liberam vaga em 30 dias.
        </p>

        <p className="mt-2 text-foreground">
          {isPractice ? (
            atLimit ? (
              <>
                Estamos finalizando o plano <strong>Clinic</strong> (100+ pacientes) —
                quer entrar na lista de espera pra ser avisado primeiro?
              </>
            ) : (
              <>
                Estamos finalizando o plano <strong>Clinic</strong> (100+ pacientes) —
                quer entrar na lista de espera?
              </>
            )
          ) : atLimit ? (
            <>
              Pra cadastrar mais pessoas: faça upgrade pro <strong>Practice</strong>{" "}
              (até 50 vagas) ou abra espaço excluindo um paciente ativo
              {showArchivedHint ? " ou arquivado" : ""}.
            </>
          ) : (
            <>
              {remaining === 1 ? (
                <>Falta <strong>1 vaga</strong> </>
              ) : (
                <>Faltam <strong>{remaining} vagas</strong> </>
              )}
              para bloquear novos cadastros no plano Basic. Com o Practice, você atende
              até <strong>50 pacientes</strong> — mais do dobro da sua capacidade atual.
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
              <Link to="/settings/billing">Ver plano Practice</Link>
            </Button>
          )}
          {showArchivedHint && atLimit ? (
            <Button size="sm" variant="outline" asChild>
              <Link to="/patients" search={{ status: "archived" } as never}>
                Ver arquivados ({archived})
              </Link>
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Agora não
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
