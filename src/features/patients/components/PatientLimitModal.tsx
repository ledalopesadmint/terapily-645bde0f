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
          <DialogDescription>
            {isPractice ? (
              <>
                Estamos finalizando o plano <strong>Clinic</strong> (100+ pacientes,
                multi-terapeuta). Entre na lista de espera pra ser avisado primeiro,
                ou libere uma vaga excluindo um paciente.
              </>
            ) : (
              <>
                Você cadastrou <strong>{max} de {max} pacientes</strong> do Basic.
                Com o <strong>Practice</strong>, você atende até{" "}
                <strong>50 pacientes ativos</strong> — mais do dobro da sua capacidade
                atual. Você também pode liberar uma vaga excluindo um paciente
                (arquivados continuam contando porque seguimos custodiando os dados).
              </>
            )}
          </DialogDescription>
        </DialogHeader>

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
