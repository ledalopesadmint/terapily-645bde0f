import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  /** Valor final */
  end: number;
  /** Duração em ms. Default 1400. */
  duration?: number;
  /** Disparar só quando entrar na viewport (default true) */
  triggerOnView?: boolean;
}

/**
 * Anima contagem de 0 até `end` quando o elemento ref entra na viewport.
 * Respeita prefers-reduced-motion (mostra valor final imediatamente).
 */
export function useCountUp({ end, duration = 1400, triggerOnView = true }: UseCountUpOptions) {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      if (reduced) {
        setValue(end);
        return;
      }

      const t0 = performance.now();
      const tick = (now: number) => {
        const elapsed = now - t0;
        const p = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(end * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!triggerOnView) {
      start();
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      start();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            start();
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [end, duration, triggerOnView]);

  return { ref, value };
}
