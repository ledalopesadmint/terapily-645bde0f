/**
 * BreathingRunner — Immersive breathing exercise player.
 *
 * Premium visual experience for breathing exercises (4-7-8, Box Breathing, etc.).
 * Full-screen animated breathing circle with phase-synced gradients,
 * synthesized bell/breath sounds, Spotify link, and cycle tracking.
 *
 * All animations are pure CSS — zero external dependencies, < 50KB total.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Music, Volume2, VolumeX, Check, Play, Pause, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { BreathingConfig, BreathingPhase } from "./breathing-types";
import { playBell, playBreathSound } from "./breathing-sounds";

interface BreathingRunnerProps {
  config: BreathingConfig;
  onSubmit?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

// Phase colors (oklch-based for smoothness)
const PHASE_STYLES: Record<string, { bg: string; circle: string; glow: string; text: string; label: string }> = {
  grow: {
    bg: "from-[oklch(0.95_0.02_160)] via-[oklch(0.92_0.03_170)] to-[oklch(0.88_0.04_180)]",
    circle: "bg-[oklch(0.72_0.08_160/0.85)]",
    glow: "oklch(0.72 0.08 160 / 0.2)",
    text: "text-[oklch(0.35_0.05_160)]",
    label: "text-[oklch(0.40_0.06_160)]",
  },
  hold: {
    bg: "from-[oklch(0.92_0.02_280)] via-[oklch(0.90_0.03_270)] to-[oklch(0.87_0.04_260)]",
    circle: "bg-[oklch(0.65_0.06_270/0.85)]",
    glow: "oklch(0.65 0.06 270 / 0.2)",
    text: "text-[oklch(0.30_0.05_270)]",
    label: "text-[oklch(0.35_0.06_270)]",
  },
  shrink: {
    bg: "from-[oklch(0.94_0.02_80)] via-[oklch(0.91_0.03_70)] to-[oklch(0.88_0.04_60)]",
    circle: "bg-[oklch(0.70_0.07_80/0.85)]",
    glow: "oklch(0.70 0.07 80 / 0.2)",
    text: "text-[oklch(0.33_0.05_80)]",
    label: "text-[oklch(0.38_0.06_80)]",
  },
};

type RunnerState = "idle" | "running" | "paused" | "done";

export function BreathingRunner({
  config,
  onSubmit,
  submitting,
  submitLabel = "Concluir exercício",
}: BreathingRunnerProps) {
  const { cycles, phases, spotifyUrl, sounds } = config;
  const totalPhases = phases.length;
  const cycleDuration = phases.reduce((s, p) => s + p.durationSec, 0);
  const isMobile = useIsMobile();

  const [state, setState] = useState<RunnerState>("idle");
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const bellPlayedRef = useRef(false);

  const phase = phases[currentPhaseIdx];
  const phaseDuration = phase?.durationSec ?? 1;
  const phaseProgress = Math.min(phaseElapsed / phaseDuration, 1);
  const style = PHASE_STYLES[phase?.animation ?? "grow"] ?? PHASE_STYLES.grow;

  // Circle scale: much more dramatic range for real breathing guidance
  // Min 0.35, max 1.0 — the circle breathes WITH you
  const getCircleScale = () => {
    if (!phase) return 0.5;
    // Ease function for organic feel
    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const eased = easeInOut(phaseProgress);
    switch (phase.animation) {
      case "grow":
        return 0.35 + 0.65 * eased;
      case "hold":
        return 1.0;
      case "shrink":
        return 1.0 - 0.65 * eased;
      default:
        return 0.5;
    }
  };

  const circleScale = getCircleScale();

  // Responsive base size — circle should fill most of the available space
  // Desktop: 280px, Tablet: 240px, Mobile: 200px base (at scale 1.0)
  const baseSize = isMobile ? 200 : 280;

  // Main loop
  const tick = useCallback(() => {
    const now = performance.now();
    const dt = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    setPhaseElapsed((prev) => {
      const next = prev + dt;
      if (next >= phaseDuration) {
        const nextPhaseIdx = currentPhaseIdx + 1;
        if (nextPhaseIdx >= totalPhases) {
          const nextCycle = currentCycle + 1;
          if (nextCycle >= cycles) {
            setState("done");
            if (soundEnabled && sounds?.bell) playBell(0.3);
            return 0;
          }
          setCurrentCycle(nextCycle);
          setCurrentPhaseIdx(0);
        } else {
          setCurrentPhaseIdx(nextPhaseIdx);
        }
        return 0;
      }
      return next;
    });

    if (state === "running") {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [state, currentPhaseIdx, currentCycle, cycles, totalPhases, phaseDuration, soundEnabled, sounds]);

  useEffect(() => {
    if (state === "running") {
      lastTickRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, tick]);

  // Play sounds on phase change
  useEffect(() => {
    if (state !== "running" || !soundEnabled) return;
    if (!sounds) return;

    if (sounds.bell && !bellPlayedRef.current) {
      playBell(0.2);
      bellPlayedRef.current = true;
    }

    if (sounds.breathGuide && phase) {
      if (phase.animation === "grow") {
        playBreathSound(phase.durationSec, "inhale", 0.06);
      } else if (phase.animation === "shrink") {
        playBreathSound(phase.durationSec, "exhale", 0.06);
      }
    }
  }, [state, currentPhaseIdx, currentCycle, soundEnabled, sounds, phase]);

  const start = useCallback(() => {
    setState("running");
    bellPlayedRef.current = false;
  }, []);

  const pause = useCallback(() => setState("paused"), []);
  const resume = useCallback(() => setState("running"), []);
  const restart = useCallback(() => {
    setState("idle");
    setCurrentCycle(0);
    setCurrentPhaseIdx(0);
    setPhaseElapsed(0);
    bellPlayedRef.current = false;
  }, []);

  const totalCyclesSec = cycleDuration * cycles;
  const elapsedTotal =
    currentCycle * cycleDuration +
    phases.slice(0, currentPhaseIdx).reduce((s, p) => s + p.durationSec, 0) +
    phaseElapsed;
  const overallProgress = totalCyclesSec > 0 ? elapsedTotal / totalCyclesSec : 0;

  const phaseRemaining = Math.max(0, Math.ceil(phaseDuration - phaseElapsed));

  const currentSize = baseSize * circleScale;
  const glowSize = currentSize + 60;

  return (
    <div className="flex flex-col h-full min-h-[500px] relative overflow-hidden select-none">
      {/* Animated gradient background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-all duration-[2000ms] ease-in-out",
          style.bg,
        )}
      />

      {/* Decorative wave */}
      <svg
        className="absolute bottom-0 left-0 right-0 h-32 opacity-[0.06] pointer-events-none"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          className="text-[var(--sage)]"
          d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,160C960,149,1056,171,1152,186.7C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        >
          <animate
            attributeName="d"
            dur="10s"
            repeatCount="indefinite"
            values="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,160C960,149,1056,171,1152,186.7C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z;M0,192L48,202.7C96,213,192,235,288,229.3C384,224,480,192,576,186.7C672,181,768,203,864,208C960,213,1056,203,1152,197.3C1248,192,1344,192,1392,192L1440,192L1440,320L0,320Z;M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,160C960,149,1056,171,1152,186.7C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z"
          />
        </path>
      </svg>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[var(--sage)]/8"
            style={{
              width: `${10 + i * 5}px`,
              height: `${10 + i * 5}px`,
              left: `${10 + i * 18}%`,
              top: `${15 + (i % 3) * 28}%`,
              animation: `float-particle ${7 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        ))}
      </div>

      {/* Top controls */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
            "bg-white/30 backdrop-blur-sm hover:bg-white/50",
            style.text,
          )}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {soundEnabled ? "Som" : "Mudo"}
        </button>

        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
              "bg-white/30 backdrop-blur-sm hover:bg-white/50",
              style.text,
            )}
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Playlist Terapily</span>
            <span className="sm:hidden">♪</span>
          </a>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Cycle counter */}
        {state !== "idle" && state !== "done" && (
          <p className={cn("text-[0.65rem] font-bold uppercase tracking-[0.16em] opacity-50 mb-3", style.text)}>
            Ciclo {currentCycle + 1} de {cycles}
          </p>
        )}

        {/* Phase label ABOVE the circle */}
        {(state === "running" || state === "paused") && phase && (
          <p
            className={cn(
              "font-display text-2xl sm:text-3xl md:text-4xl tracking-wide mb-6 transition-all duration-700",
              style.label,
            )}
          >
            {phase.label}
          </p>
        )}

        {/* Idle instruction */}
        {state === "idle" && (
          <p className={cn("font-display text-2xl sm:text-3xl tracking-wide mb-6 opacity-70", style.label)}>
            Encontre uma posição confortável
          </p>
        )}

        {/* Done label */}
        {state === "done" && (
          <p className={cn("font-display text-2xl sm:text-3xl tracking-wide mb-6", style.label)}>
            Exercício concluído
          </p>
        )}

        {/* The breathing circle */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: `${baseSize + 80}px`, height: `${baseSize + 80}px` }}
        >
          {/* Outer glow */}
          <div
            className="absolute rounded-full transition-opacity duration-700"
            style={{
              width: `${glowSize}px`,
              height: `${glowSize}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${style.glow}, transparent 70%)`,
              opacity: state === "running" || state === "paused" ? 0.6 : 0,
            }}
          />

          {/* Main circle — size driven by JS for organic feel */}
          <div
            className={cn("rounded-full flex items-center justify-center", style.circle)}
            style={{
              width: `${currentSize}px`,
              height: `${currentSize}px`,
              boxShadow: `0 0 ${40 * circleScale}px ${10 * circleScale}px ${style.glow}`,
              transition: "background-color 1.5s ease",
            }}
          >
            {/* Only the countdown number inside */}
            {(state === "running" || state === "paused") && (
              <span
                className="text-white/90 font-mono tabular-nums font-light"
                style={{ fontSize: `${Math.max(32, currentSize * 0.28)}px` }}
              >
                {phaseRemaining}
              </span>
            )}

            {state === "idle" && (
              <span
                className="text-white/70 font-display"
                style={{ fontSize: `${Math.max(20, currentSize * 0.18)}px` }}
              >
                Pronto?
              </span>
            )}

            {state === "done" && (
              <Check className="text-white/90" style={{ width: `${currentSize * 0.25}px`, height: `${currentSize * 0.25}px` }} />
            )}
          </div>
        </div>

        {/* Cycle dots */}
        {state !== "idle" && (
          <div className="flex items-center gap-2 mt-5">
            {[...Array(cycles)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  i < currentCycle
                    ? "w-2 bg-white/60"
                    : i === currentCycle && state !== "done"
                      ? "w-5 bg-white/80"
                      : i === currentCycle && state === "done"
                        ? "w-2 bg-white/60"
                        : "w-2 bg-white/25",
                )}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {state !== "idle" && (
          <div className="w-32 h-1 rounded-full bg-white/15 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/50 transition-all duration-300"
              style={{ width: `${overallProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {state === "idle" && (
          <button
            onClick={start}
            className={cn(
              "flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-medium transition-all",
              "bg-white/70 backdrop-blur-sm shadow-lg hover:bg-white/90 hover:shadow-xl",
              "active:scale-[0.97] touch-manipulation",
              style.text,
            )}
          >
            <Play className="w-4 h-4" />
            Iniciar
          </button>
        )}

        {state === "running" && (
          <button
            onClick={pause}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all",
              "bg-white/30 backdrop-blur-sm hover:bg-white/50",
              "active:scale-[0.97] touch-manipulation",
              style.text,
            )}
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>
        )}

        {state === "paused" && (
          <div className="flex items-center gap-3">
            <button
              onClick={restart}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium transition-all",
                "bg-white/20 backdrop-blur-sm hover:bg-white/40 touch-manipulation",
                style.text,
              )}
            >
              <RotateCcw className="w-4 h-4" />
              Recomeçar
            </button>
            <button
              onClick={resume}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all",
                "bg-white/70 backdrop-blur-sm shadow-lg hover:bg-white/90",
                "active:scale-[0.97] touch-manipulation",
                style.text,
              )}
            >
              <Play className="w-4 h-4" />
              Continuar
            </button>
          </div>
        )}

        {state === "done" && (
          <button
            onClick={() => onSubmit?.()}
            disabled={submitting}
            className={cn(
              "flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-medium transition-all",
              submitting
                ? "bg-white/30 text-white/50 cursor-not-allowed"
                : "bg-white/70 backdrop-blur-sm shadow-lg hover:bg-white/90 active:scale-[0.97] touch-manipulation",
              style.text,
            )}
          >
            <Check className="w-4 h-4" />
            {submitting ? "Registrando…" : submitLabel}
          </button>
        )}
      </div>

      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-25px) translateX(12px); opacity: 0.6; }
          50% { transform: translateY(-40px) translateX(-8px); opacity: 0.4; }
          75% { transform: translateY(-18px) translateX(18px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/** Utility: for breathing exercises, completion = all cycles done */
export function getBreathingCompletion(config: BreathingConfig, state: string) {
  return {
    total: config.cycles,
    completed: state === "done" ? config.cycles : 0,
    completion: state === "done" ? 100 : 0,
    allAnswered: state === "done",
  };
}
