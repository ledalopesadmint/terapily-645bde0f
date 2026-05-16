import { useEffect, useState } from "react";

/**
 * Microcopy discreto: avisa quando Caps Lock está ativo enquanto o
 * usuário foca um campo de senha. Reduz frustração silenciosa de login.
 */
export function CapsLockHint() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // getModifierState funciona no keydown/keyup
      if (typeof e.getModifierState === "function") {
        setOn(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
    };
  }, []);

  if (!on) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 9l5-5 5 5M5 12h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Caps Lock is on.
    </p>
  );
}
