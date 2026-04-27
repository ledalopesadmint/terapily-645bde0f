import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
  tone?: "mauve" | "sage" | "muted" | "terracotta";
}

/**
 * Eyebrow tipográfica do brand book Terapily.
 * ALL CAPS, Inter Bold, tracking +120 (0.12em).
 * Default tone: Mauve (acento decorativo, ≤8% da página).
 * Tom `terracotta` é uso editorial pontual (hero), permanece dentro do espírito da paleta.
 */
export function Eyebrow({ children, className, tone = "mauve" }: EyebrowProps) {
  const toneClass = {
    mauve: "text-[oklch(0.55_0.04_0)]", // Mauve-deep para passar contraste
    sage: "text-secondary",
    muted: "text-muted-foreground",
    terracotta: "text-terracotta",
  }[tone];

  return (
    <p
      className={cn(
        "text-[0.6875rem] uppercase font-extrabold",
        toneClass,
        className,
      )}
      style={{ letterSpacing: "0.12em" }}
    >
      {children}
    </p>
  );
}
