/**
 * Brand vinheta intro — plays before every activity/scale.
 * Lightweight 140KB video (960×540, 3s, h264 baseline + AAC 96k).
 * Volume controlled via volumePercent prop (15–100, never 0 per sonic branding rules).
 *
 * Strategy: start muted (autoplay always allowed), then unmute after play starts.
 * If unmute fails, the visual branding still plays — never skip the vinheta.
 *
 * Mobile fix: use the `autoplay` attribute directly (no JS .play() on load),
 * and listen for `playing` event to detect autoplay success. If autoplay doesn't
 * fire within 2s, show a tap-to-play overlay so the user can trigger playback
 * with a gesture. Fallback after 5s regardless.
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
  const playingDetected = useRef(false);

  // Clamp volume: min 15%, max 100%
  const clampedVolume = Math.max(15, Math.min(100, volumePercent)) / 100;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const tryUnmute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.volume = clampedVolume;
      v.muted = false;
    } catch {
      // Some mobile browsers block unmute — visual branding continues
    }
  }, [clampedVolume]);

  const handlePlaying = useCallback(() => {
    if (playingDetected.current) return;
    playingDetected.current = true;
    setNeedsTap(false);
    // Try to unmute now that playback is confirmed
    tryUnmute();
  }, [tryUnmute]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v && v.currentTime > 0.12) setVideoVisible(true);
  }, []);

  const handleEnded = useCallback(() => {
    finish();
  }, [finish]);

  // Tap-to-play: user gesture triggers play + unmute
  const handleTap = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = clampedVolume;
    v.play().catch(() => {
      // If even tapped play fails, just skip
      finish();
    });
    setNeedsTap(false);
  }, [clampedVolume, finish]);

  // If autoplay didn't fire within 2s, show tap prompt
  useEffect(() => {
    const tapTimer = setTimeout(() => {
      if (!playingDetected.current && !completedRef.current) {
        // Try one more programmatic play
        const v = videoRef.current;
        if (v) {
          v.muted = true;
          v.play()
            .then(() => {
              playingDetected.current = true;
              tryUnmute();
            })
            .catch(() => {
              setNeedsTap(true);
            });
        } else {
          setNeedsTap(true);
        }
      }
    }, 2000);
    return () => clearTimeout(tapTimer);
  }, [tryUnmute]);

  // Fallback: skip after 5s max regardless
  useEffect(() => {
    const timer = setTimeout(finish, 5000);
    return () => clearTimeout(timer);
  }, [finish]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--cream)]"
      onClick={needsTap ? handleTap : undefined}
    >
      {/* Static fallback — always visible behind video */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--cream)] text-[var(--navy)]">
        <div className="font-display text-5xl font-light leading-none md:text-7xl">terapily</div>
        <div className="mt-4 h-px w-24 bg-[var(--sage)]/60" />
        {needsTap && (
          <button
            onClick={handleTap}
            className="mt-8 rounded-full bg-[var(--sage)] px-6 py-2.5 text-sm font-medium text-white shadow-md active:scale-95 transition-transform"
          >
            Toque para iniciar
          </button>
        )}
      </div>

      <video
        ref={videoRef}
        src="/brand/vinheta-creme.mp4"
        poster="/brand/vinheta-creme-poster.jpg"
        onPlaying={handlePlaying}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={finish}
        autoPlay
        playsInline
        muted
        preload="auto"
        className={`relative z-10 h-full w-full object-cover transition-opacity duration-300 ${videoVisible ? "opacity-100" : "opacity-0"}`}
        style={{ background: "var(--cream)" }}
      />
    </div>
  );
}
