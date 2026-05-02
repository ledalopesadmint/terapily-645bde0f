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
  const [videoVisible, setVideoVisible] = useState(false);
  const completedRef = useRef(false);
  const playRequestedRef = useRef(false);

  // Clamp volume: min 15%, max 100%
  const clampedVolume = Math.max(15, Math.min(100, volumePercent)) / 100;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const startPlayback = useCallback(() => {
    if (playRequestedRef.current) return;
    playRequestedRef.current = true;
    const v = videoRef.current;
    if (!v) return;

    // Start muted (autoplay always allowed when muted)
    v.muted = true;
    v.volume = clampedVolume;
    v.play()
      .then(() => {
        setVideoVisible(true);
        // Try to unmute after play starts
        v.muted = false;
      })
      .catch(() => {
        // Even muted autoplay failed — keep the branded visual visible until fallback completes.
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
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--cream)]">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--cream)] text-[var(--navy)]">
        <div className="font-display text-5xl font-light leading-none md:text-7xl">terapily</div>
        <div className="mt-4 h-px w-24 bg-[var(--sage)]/60" />
      </div>
      <video
        ref={videoRef}
        src="/brand/vinheta-creme.mp4"
        poster="/brand/vinheta-creme-poster.jpg"
        onLoadedData={startPlayback}
        onCanPlay={startPlayback}
        onEnded={handleEnded}
        onError={finish}
        autoPlay
        playsInline
        muted
        preload="auto"
        className={`relative z-10 h-full w-full object-contain transition-opacity duration-300 ${videoVisible ? "opacity-100" : "opacity-0"}`}
        style={{ background: "var(--cream)" }}
      />
    </div>
  );
}
