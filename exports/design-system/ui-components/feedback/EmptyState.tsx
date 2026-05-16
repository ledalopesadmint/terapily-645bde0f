import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  comingSoonWeek?: string; // ex: "Semana 2" — mostra badge honesto
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState honesto do Terapily.
 *
 * REGRA FUTURE-PROOF: usado pra qualquer feature que ainda não tem backend real.
 * Mostra badge "Em breve · Semana X" pra evitar fluxos fake ou UI sem dados.
 *
 * Voz seguindo o brand book: microcopy mínimo, sem jargão.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  comingSoonWeek,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-display text-2xl text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {comingSoonWeek && (
        <Badge variant="outline" className="mt-4 border-secondary/40 text-secondary-foreground">
          Em breve · {comingSoonWeek}
        </Badge>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
