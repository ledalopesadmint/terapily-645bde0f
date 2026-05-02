/**
 * Brand vinheta intro — plays before every activity/scale.
 * Lightweight 140KB video (960×540, 3s, h264 baseline + AAC 96k).
 * Volume controlled via volumePercent prop (15–100, never 0 per sonic branding rules).
 *
 * Strategy: start muted (autoplay always allowed), then unmute after play starts.
 * If unmute fails, the visual branding still plays — never skip the vinheta.
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
  const [ready, setReady] = useState(false);
  const completedRef = useRef(false);

  // Clamp volume: min 15%, max 100%
  const clampedVolume = Math.max(15, Math.min(100, volumePercent)) / 100;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const handleCanPlay = useCallback(() => {
    setReady(true);
    const v = videoRef.current;
    if (!v) return;

    // Start muted (autoplay always allowed when muted)
    v.muted = true;
    v.play()
      .then(() => {
        // Try to unmute after play starts
        v.muted = false;
        v.volume = clampedVolume;
      })
      .catch(() => {
        // Even muted autoplay failed (very rare) — still show visual, skip after timeout
      });
  }, [clampedVolume]);

  const handleEnded = useCallback(() => {
    finish();
  }, [finish]);

  // Fallback: if video stalls or errors, skip after 5s max
  useEffect(() => {
    const timer = setTimeout(() => {
      finish();
    }, 5000);
    return () => clearTimeout(timer);
  }, [finish]);

  return (
    <div className="absolute inset-0 bg-[var(--cream)] flex items-center justify-center">
      <video
        ref={videoRef}
        src="/brand/vinheta-creme.mp4"
        onCanPlayThrough={handleCanPlay}
        onEnded={handleEnded}
        onError={finish}
        playsInline
        muted
        preload="auto"
        className={`w-full h-full object-contain transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ background: "var(--cream)" }}
      />
    </div>
  );
}
