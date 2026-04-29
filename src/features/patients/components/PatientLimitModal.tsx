/**
 * Modal mostrado quando o terapeuta bate 100% do limite ao tentar cadastrar.
 * - Basic: oferece upgrade pro Practice ou excluir paciente.
 * - Practice: oferece lista de espera do Clinic ou excluir paciente.
 */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, ListPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinClinicWaitlist } from "@/features/patients/patients.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: string;
  max: number;
  ownerEmail?: string | null;
}

export function PatientLimitModal({
  open,
  onOpenChange,
  tier,
  max,
  ownerEmail,
}: Props) {
  const isPractice = tier === "practice";

  const [email, setEmail] = useState(ownerEmail ?? "");
  const [projection, setProjection] = useState<string>("");

  const waitlistMut = useMutation({
    mutationFn: () =>
      joinClinicWaitlist({
        data: {
          email,
          projected_patient_count: projection ? Number(projection) : undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.alreadyOnList
          ? "Você já está na lista. Avisaremos assim que o Clinic estiver pronto."
          : "Pronto. Avisaremos assim que o Clinic estiver disponível.",
      );
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isPractice
              ? `Você atingiu ${max} de ${max} pacientes do Practice.`
              : "Você atingiu o limite do plano Basic."}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isPractice
              ? "Você atingiu o limite do plano Practice. Entre na lista de espera do Clinic ou libere uma vaga."
              : `Você cadastrou ${max} de ${max} pacientes. Faça upgrade pro Practice ou libere uma vaga.`}
          </DialogDescription>
        </DialogHeader>

        {isPractice ? (
          <p className="text-sm text-muted-foreground">
            Estamos finalizando o plano <strong>Clinic</strong> (100+ pacientes,
            multi-terapeuta). Entre na lista de espera pra ser avisado primeiro,
            ou libere uma vaga excluindo um paciente.
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-foreground">
              Você cadastrou <strong>{max} de {max} pacientes</strong>. Pra receber
              alguém novo, você tem duas opções:
            </p>

            <div className="rounded-lg border border-sage/40 bg-sage/5 p-4">
              <p className="font-medium text-foreground">
                Fazer upgrade pro Practice — <span className="font-semibold">$159/mês</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Atende até <strong>50 pacientes ativos</strong> (2,5× sua capacidade
                atual), mantém todos os dados que já estão aqui e desbloqueia o
                Compliance Report exportável.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-medium text-foreground">Ou liberar uma vaga</p>
              <p className="mt-1 text-muted-foreground">
                Excluir um paciente devolve uma vaga e mantém os dados restauráveis
                por 30 dias. Pacientes arquivados continuam contando porque seguimos
                custodiando os dados deles.
              </p>
            </div>
          </div>
        )}

        {isPractice ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="waitlist-email">Email pra contato</Label>
              <Input
                id="waitlist-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@clinica.com"
              />
            </div>
            <div>
              <Label htmlFor="waitlist-projection">
                Quantos pacientes você projeta atender? (opcional)
              </Label>
              <Input
                id="waitlist-projection"
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                value={projection}
                onChange={(e) => setProjection(e.target.value)}
                placeholder="Ex: 80"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {isPractice ? "Fechar" : "Agora não"}
          </Button>
          {isPractice ? (
            <Button
              onClick={() => waitlistMut.mutate()}
              disabled={!email || waitlistMut.isPending}
            >
              <ListPlus className="mr-2 h-4 w-4" />
              {waitlistMut.isPending ? "Enviando…" : "Entrar na lista"}
            </Button>
          ) : (
            <Button asChild>
              <Link to="/settings/billing">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Ver plano Practice
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
