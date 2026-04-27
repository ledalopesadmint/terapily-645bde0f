import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay em ms antes da animação dispar */
  delay?: number;
  /** Variante de animação */
  variant?: "up" | "fade" | "scale";
  /** rootMargin do IntersectionObserver */
  rootMargin?: string;
  /** Tag HTML (default: div) */
  as?: "div" | "section" | "article" | "li" | "header";
}

/**
 * Reveal — wrapper que dispara animação CSS quando o elemento entra na viewport.
 * Usa IntersectionObserver, com fallback elegante via prefers-reduced-motion (CSS).
 * Server-render seguro: opacity 0 inicial → flip pra is-visible no client.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  rootMargin = "0px 0px -10% 0px",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // SSR-safe: se o browser não tem IO, mostra direto
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin, threshold: 0.05 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", visible && "is-visible", className)}
      data-variant={variant}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
