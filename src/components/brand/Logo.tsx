import { cn } from "@/lib/utils";
import iconSrc from "@/assets/terapily-icon.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Mostra o ícone squircle navy ao lado do wordmark.
   * Use no header da landing pública. Em auth/footer deixe `false` (default).
   */
  withIcon?: boolean;
}

/**
 * Logo wordmark Terapily.
 *
 * Brand book: wordmark sempre minúsculo (`terapily`), Cormorant SemiBold.
 * Capitalizado só em prosa (Terapily), nunca aqui.
 */
export function Logo({ className, size = "md", withIcon = false }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  };

  // Ícone proporcional à altura cap da fonte — levemente maior pra equilíbrio óptico.
  const iconSizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
    xl: "h-20 w-20",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Terapily"
    >
      {withIcon && (
        <img
          src={iconSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            "shrink-0 select-none object-contain",
            iconSizeClasses[size],
          )}
          draggable={false}
        />
      )}
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          sizeClasses[size],
        )}
      >
        terapily<span className="text-secondary">.</span>
      </span>
    </span>
  );
}
