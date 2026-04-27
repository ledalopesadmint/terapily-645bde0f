import { cn } from "@/lib/utils";
import terapilyIcon from "@/assets/terapily-icon.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Ocultar o ícone (útil em contextos onde só o wordmark é desejado). */
  hideIcon?: boolean;
}

/**
 * Logo Terapily — ícone + wordmark.
 *
 * Brand book: wordmark sempre minúsculo (`terapily`), Cormorant SemiBold.
 * Capitalizado só em prosa (Terapily), nunca aqui.
 *
 * O ícone (Navy + monograma serifado creme) precede o wordmark com gap calibrado.
 * Tamanho do ícone segue a altura cap-height do texto pra harmonia visual.
 */
export function Logo({ className, size = "md", hideIcon = false }: LogoProps) {
  const sizeMap = {
    sm: { text: "text-xl", icon: "h-7 w-7", gap: "gap-2" },
    md: { text: "text-2xl", icon: "h-8 w-8", gap: "gap-2.5" },
    lg: { text: "text-4xl", icon: "h-12 w-12", gap: "gap-3" },
    xl: { text: "text-6xl", icon: "h-16 w-16", gap: "gap-4" },
  } as const;

  const s = sizeMap[size];

  return (
    <span
      className={cn("inline-flex items-center", s.gap, className)}
      aria-label="Terapily"
    >
      {!hideIcon && (
        <img
          src={terapilyIcon}
          alt=""
          aria-hidden="true"
          className={cn(s.icon, "shrink-0 select-none")}
          draggable={false}
        />
      )}
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground leading-none",
          s.text,
        )}
      >
        terapily<span className="text-secondary">.</span>
      </span>
    </span>
  );
}
