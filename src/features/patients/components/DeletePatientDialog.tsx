/**
 * Diálogo de confirmação destrutiva. Exige digitar `EXCLUIR <apelido>`
 * pra liberar o botão. Wording obrigatório vem da policy
 * `mem://features/patient-deletion-policy`.
 */
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PatientDTO } from "../patients.types";

interface Props {
  patient: PatientDTO | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (p: PatientDTO) => void;
  pending: boolean;
}

export function DeletePatientDialog({
  patient,
  onOpenChange,
  onConfirm,
  pending,
}: Props) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!patient) setTyped("");
  }, [patient]);

  if (!patient) {
    return (
      <AlertDialog open={false} onOpenChange={onOpenChange}>
        <AlertDialogContent />
      </AlertDialog>
    );
  }

  const expected = `EXCLUIR ${patient.display_name}`;
  const matches = typed.trim() === expected;

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {patient.display_name}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Os dados ficam cifrados e disponíveis pra restauração por{" "}
                <strong>30 dias</strong>. Após esse período, nome, email e
                telefone são apagados em definitivo (audit trail é mantido sem
                dados pessoais).
              </p>
              <p>
                Pra restaurar antes do prazo:{" "}
                <strong>Pacientes → Excluídos</strong>.
              </p>
              <p>
                Pra confirmar, digite{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                  {expected}
                </code>{" "}
                abaixo.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={expected}
          autoComplete="off"
          aria-label="Confirmação de exclusão"
        />

        <AlertDialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={() => onConfirm(patient)}
          >
            {pending ? "Excluindo…" : "Excluir paciente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
