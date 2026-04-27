import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Logo wordmark Terapily.
 *
 * Brand book: wordmark sempre minúsculo (`terapily`), Cormorant SemiBold.
 * Capitalizado só em prosa (Terapily), nunca aqui.
 *
 * Esta é a versão tipográfica — placeholder até receber o SVG final.
 */
export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  };

  return (
    <span
      className={cn(
        "font-display font-semibold tracking-tight text-foreground",
        sizeClasses[size],
        className,
      )}
      aria-label="Terapily"
    >
      terapily<span className="text-secondary">.</span>
    </span>
  );
}
