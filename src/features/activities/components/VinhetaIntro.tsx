/**
 * Brand vinheta intro — plays before every activity/scale.
 * Lightweight 140KB video (960×540, 3s, h264 baseline + AAC 96k).
 * Volume controlled via volumePercent prop (15–100, never 0 per sonic branding rules).
 *
 * The video fills the fullscreen overlay with a matching cream background
 * so it feels like a seamless brand moment, not a "small video in a box".
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

  // Clamp volume: min 15%, max 100%
  const clampedVolume = Math.max(15, Math.min(100, volumePercent)) / 100;

  const handleCanPlay = useCallback(() => {
    setReady(true);
    const v = videoRef.current;
    if (!v) return;
    v.volume = clampedVolume;
    v.play().catch(() => {
      // Autoplay blocked — skip vinheta gracefully
      onComplete();
    });
  }, [clampedVolume, onComplete]);

  const handleEnded = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Fallback: if video stalls or errors, skip after 5s max
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--cream)] flex items-center justify-center">
      <video
        ref={videoRef}
        src="/brand/vinheta-creme.mp4"
        onCanPlayThrough={handleCanPlay}
        onEnded={handleEnded}
        onError={onComplete}
        playsInline
        muted={false}
        preload="auto"
        className={`w-full h-full object-contain transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ background: "var(--cream)" }}
      />
    </div>
  );
}
