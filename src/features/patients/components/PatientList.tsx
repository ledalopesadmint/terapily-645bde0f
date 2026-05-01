/**
 * Lista de pacientes ativos/arquivados. Apresentação pura — recebe os dados
 * via props, não faz fetch nem mutação.
 *
 * Não exibe PHI: só `display_name`, `initials` e `tags` (todos não-PHI).
 * O acesso a email/telefone é feito via botões de cópia que disparam o
 * server function `revealPatientContact` (auditado).
 */
import { AlertTriangle, Plus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PatientDTO, PatientStatusFilter } from "../patients.types";

interface Props {
  patients: PatientDTO[];
  status: PatientStatusFilter;
  isLoading: boolean;
  copying: boolean;
  onOpenDetails: (p: PatientDTO) => void;
  onCopyContact: (p: PatientDTO, field: "email" | "phone", label: string) => void;
  onCreate: () => void;
}

export function PatientList({
  patients,
  status,
  isLoading,
  copying,
  onOpenDetails,
  onCopyContact,
  onCreate,
}: Props) {
  if (isLoading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Carregando…
      </p>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
        <p className="font-display text-2xl text-foreground">
          {status === "active"
            ? "Nenhum paciente ativo ainda."
            : "Nenhum paciente arquivado."}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "active"
            ? "Cadastre o primeiro paciente pra começar a usar o acervo."
            : "Pacientes arquivados aparecem aqui pra você restaurar quando precisar."}
        </p>
        {status === "active" && (
          <Button className="mt-6" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar paciente
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {patients.map((p) => {
        const hasEmail = p.email != null && p.email.length > 0;
        const hasPhone = p.phone != null && p.phone.length > 0;
        return (
          <li
            key={p.id}
            className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/30"
          >
            <button
              type="button"
              onClick={() => onOpenDetails(p)}
              className="group flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
              aria-label={`Abrir detalhes de ${p.display_name}`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage/20 font-medium text-foreground transition-all group-hover:scale-105 group-hover:bg-sage/30 group-hover:text-sage">
                {p.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground transition-colors group-hover:text-sage">
                  <span className="story-link">{p.display_name}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.tags.length > 0 ? p.tags.join(" · ") : "Sem etiquetas"}
                </p>
              </div>
              {p.clinical_flags && p.clinical_flags.total > 0 && (
                <span
                  className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-md border border-mauve/60 bg-mauve/15 px-2 py-1 text-xs font-semibold text-foreground"
                  aria-label="Paciente com flag clínica"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-mauve" />
                  Flag
                </span>
              )}
            </button>

            <TooltipProvider delayDuration={150}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!hasEmail || copying}
                        onClick={() => onCopyContact(p, "email", "Email")}
                        aria-label="Copiar email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasEmail ? "Copiar email" : "Sem email cadastrado"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!hasPhone || copying}
                        onClick={() => onCopyContact(p, "phone", "Telefone")}
                        aria-label="Copiar telefone"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasPhone ? "Copiar telefone" : "Sem telefone cadastrado"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </li>
        );
      })}
    </ul>
  );
}
