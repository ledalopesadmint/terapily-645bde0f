/**
 * SidebarLogo — variante do logo Terapily pra sidebar Navy escura.
 *
 * Mostra o glifo "t" cursivo Cream + wordmark "terapily" em Cream.
 * Wordmark sempre minúsculo (brand book). Glifo com opacidade ajustada
 * pra equilibrar com o peso visual da wordmark Cormorant SemiBold.
 */
import { cn } from "@/lib/utils";
import tIconSrc from "@/assets/terapily-t-cream.png";

interface SidebarLogoProps {
  className?: string;
  /** Quando true, esconde a wordmark e mostra só o glifo "t". */
  iconOnly?: boolean;
}

export function SidebarLogo({ className, iconOnly = false }: SidebarLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="Terapily"
    >
      <img
        src={tIconSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-9 w-9 shrink-0 select-none object-contain opacity-90 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
      />
      {!iconOnly && (
        <span className="font-display text-2xl font-semibold tracking-tight text-cream">
          terapily<span className="text-sage">.</span>
        </span>
      )}
    </span>
  );
}
