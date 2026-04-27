import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "fade" | "scale";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay em ms — usar pra stagger entre cards */
  delay?: number;
  /** Tipo de animação. Default: up */
  variant?: RevealVariant;
  /** Quanto do elemento precisa entrar pra disparar (0–1). Default 0.15 */
  threshold?: number;
  /** Tag HTML. Default div. */
  as?: "div" | "section" | "article" | "li" | "header" | "span";
}

/**
 * Envolve um bloco e aplica reveal-on-scroll via IntersectionObserver.
 * Respeita prefers-reduced-motion automaticamente via CSS.
 *
 * Use stagger atribuindo delay incremental (60–120ms) em listas de cards.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  threshold = 0.15,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // SSR-safe: IntersectionObserver só existe no cliente
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const variantClass =
    variant === "fade" ? "reveal--fade" : variant === "scale" ? "reveal--scale" : "";

  const style: CSSProperties = delay ? { animationDelay: `${delay}ms` } : {};

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", variantClass, visible && "is-visible", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
