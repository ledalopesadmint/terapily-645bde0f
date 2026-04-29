/**
 * Diálogo de detalhes do paciente. Mostra PHI mascarado com botões de cópia
 * que passam pelo server function auditado `revealPatientContact`.
 *
 * NUNCA renderizar `p.email` / `p.phone` em texto plano sem mascarar.
 */
import {
  Archive,
  ArchiveRestore,
  Mail,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PatientDTO } from "../patients.types";
import { maskEmail, maskPhone } from "./utils";

interface Props {
  patient: PatientDTO | null;
  onOpenChange: (open: boolean) => void;
  onCopy: (p: PatientDTO, field: "email" | "phone", label: string) => void;
  copying: boolean;
  onEdit: (p: PatientDTO) => void;
  onArchive: (p: PatientDTO) => void;
  onAskDelete: (p: PatientDTO) => void;
}

export function RevealContactDialog({
  patient,
  onOpenChange,
  onCopy,
  copying,
  onEdit,
  onArchive,
  onAskDelete,
}: Props) {
  if (!patient) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }
  const p = patient;
  const hasEmail = p.email != null && p.email.length > 0;
  const hasPhone = p.phone != null && p.phone.length > 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {p.display_name}
          </DialogTitle>
          <DialogDescription>
            {p.tags.length > 0 ? p.tags.join(" · ") : "Sem etiquetas"} ·{" "}
            {p.status === "active" ? "Ativo" : "Arquivado"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {p.full_name && (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Nome completo (cifrado)
              </p>
              <p className="mt-1 text-sm text-foreground">{p.full_name}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <p className="mt-1 truncate text-sm text-foreground">
                {hasEmail ? maskEmail(p.email!) : "—"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={!hasEmail || copying}
                onClick={() => onCopy(p, "email", "Email")}
              >
                <Mail className="mr-2 h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Telefone
              </p>
              <p className="mt-1 truncate text-sm text-foreground">
                {hasPhone ? maskPhone(p.phone!) : "—"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={!hasPhone || copying}
                onClick={() => onCopy(p, "phone", "Telefone")}
              >
                <Phone className="mr-2 h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            🔒 Email e telefone ficam cifrados (AES-256) no banco. Cada cópia é
            registrada em auditoria. A área de transferência se limpa em 30s.
          </p>
        </div>

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => onEdit(p)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onArchive(p)}>
              {p.status === "active" ? (
                <>
                  <Archive className="mr-2 h-4 w-4" /> Arquivar
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" /> Reativar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onAskDelete(p)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
