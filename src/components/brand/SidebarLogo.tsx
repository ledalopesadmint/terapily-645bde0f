/**
 * SidebarLogo — variante do logo Terapily pra sidebar Navy escura.
 *
 * Mostra um quadrado Cream com "t" Navy + wordmark "terapily" em Cream.
 * Wordmark sempre minúsculo (brand book).
 */
import { cn } from "@/lib/utils";

interface SidebarLogoProps {
  className?: string;
  /** Quando true, esconde a wordmark e mostra só o "t". Útil em sidebar colapsada futura. */
  iconOnly?: boolean;
}

export function SidebarLogo({ className, iconOnly = false }: SidebarLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Terapily"
    >
      <span
        aria-hidden
        className="
          flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
          bg-cream text-navy font-display font-semibold text-2xl leading-none
          shadow-[0_2px_6px_-2px_rgba(0,0,0,0.4)]
          pt-0.5
        "
      >
        t
      </span>
      {!iconOnly && (
        <span className="font-display text-2xl font-semibold tracking-tight text-cream">
          terapily<span className="text-sage">.</span>
        </span>
      )}
    </span>
  );
}
