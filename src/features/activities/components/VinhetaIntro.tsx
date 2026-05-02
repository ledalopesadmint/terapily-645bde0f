/**
 * Brand vinheta intro — plays before every activity/scale.
 * Lightweight 140KB video (960×540, 3s, h264 baseline + AAC 96k).
 * Volume controlled via volumePercent prop (15–100, never 0 per sonic branding rules).
 *
 * Mobile strategy:
 * 1. Try autoplay muted → then unmute (works on most mobile browsers)
 * 2. If unmute fails silently, visual still plays with muted audio
 * 3. If autoplay fails entirely, show tap-to-play overlay (never skip vinheta)
 * 4. Use object-contain to prevent cropping on mobile aspect ratios
 */

import { useRef, useCallback, useEffect, useState } from "react";

interface VinhetaIntroProps {
  /** Called when the vinheta finishes playing */
  onComplete: () => void;
  /** Volume 15–100 (never 0 — sonic branding rule) */
  volumePercent?: number;
}

export function VinhetaIntro({ onComplete, volumePercent = 80 }: VinhetaIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const completedRef = useRef(false);
  const playAttemptedRef = useRef(false);

  // Clamp volume: min 15%, max 100%
  const clampedVolume = Math.max(15, Math.min(100, volumePercent)) / 100;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || playAttemptedRef.current) return;
    playAttemptedRef.current = true;

    v.volume = clampedVolume;

    // Strategy 1: try playing with sound directly
    v.muted = false;
    v.play()
      .then(() => {
        // Success with sound — best case
        setVideoVisible(true);
      })
      .catch(() => {
        // Strategy 2: try muted autoplay, then unmute
        v.muted = true;
        playAttemptedRef.current = false; // allow retry
        v.play()
          .then(() => {
            setVideoVisible(true);
            // Try unmuting after play starts
            try {
              v.muted = false;
            } catch {
              // Stay muted — visual branding still plays
            }
          })
          .catch(() => {
            // Strategy 3: show tap overlay — never skip vinheta
            setNeedsTap(true);
          });
      });
  }, [clampedVolume]);

  const handleTap = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setNeedsTap(false);
    v.muted = false;
    v.volume = clampedVolume;
    v.currentTime = 0;
    v.play()
      .then(() => {
        setVideoVisible(true);
      })
      .catch(() => {
        // Last resort: skip after user tapped but still can't play
        finish();
      });
  }, [clampedVolume, finish]);

  const handleEnded = useCallback(() => {
    finish();
  }, [finish]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v && v.currentTime > 0.1) setVideoVisible(true);
  }, []);

  // Fallback: if video stalls or errors, skip after 6s max
  useEffect(() => {
    const timer = setTimeout(() => {
      finish();
    }, 6000);
    return () => clearTimeout(timer);
  }, [finish]);

  // Try to play as soon as component mounts AND video is ready
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // If already ready, try immediately
    if (v.readyState >= 2) {
      tryPlay();
    }
  }, [tryPlay]);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--cream)]">
      {/* Fallback static content — always visible behind video */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--cream)] text-[var(--navy)]">
        <div className="font-display text-4xl font-light leading-none sm:text-5xl md:text-7xl">
          terapily
        </div>
        <div className="mt-4 h-px w-24 bg-[var(--sage)]/60" />
      </div>

      {/* Video layer */}
      <video
        ref={videoRef}
        src="/brand/vinheta-creme.mp4"
        poster="/brand/vinheta-creme-poster.jpg"
        onLoadedData={tryPlay}
        onCanPlay={tryPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={finish}
        autoPlay
        playsInline
        muted
        preload="auto"
        className={`relative z-10 h-full w-full object-contain transition-opacity duration-300 ${videoVisible ? "opacity-100" : "opacity-0"}`}
        style={{ background: "var(--cream)" }}
      />

      {/* Tap-to-play overlay for mobile when autoplay fails */}
      {needsTap && (
        <button
          type="button"
          onClick={handleTap}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[var(--cream)]"
          aria-label="Toque para iniciar"
        >
          <div className="font-display text-4xl font-light text-[var(--navy)] sm:text-5xl md:text-7xl">
            terapily
          </div>
          <div className="mt-2 h-px w-24 bg-[var(--sage)]/60" />
          <p className="mt-6 text-sm text-[var(--charcoal)]/70">
            Toque para iniciar
          </p>
        </button>
      )}
    </div>
  );
}
