import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
  tone?: "mauve" | "sage" | "muted";
}

/**
 * Eyebrow tipográfica do brand book Terapily.
 * ALL CAPS, Inter Bold, tracking +120 (0.12em).
 * Default tone: Mauve (acento decorativo, ≤8% da página).
 */
export function Eyebrow({ children, className, tone = "mauve" }: EyebrowProps) {
  const toneClass = {
    mauve: "text-[oklch(0.55_0.04_0)]", // Mauve-deep para passar contraste
    sage: "text-secondary",
    muted: "text-muted-foreground",
  }[tone];

  return (
    <p
      className={cn(
        "text-[0.6875rem] font-bold uppercase",
        toneClass,
        className,
      )}
      style={{ letterSpacing: "0.12em" }}
    >
      {children}
    </p>
  );
}
