/**
 * Types for the immersive breathing runner.
 *
 * Used by guided_timer activities whose config has `runner: "breathing"`.
 * Renders a full-screen animated breathing circle instead of the
 * standard GuidedScriptRunner step-by-step view.
 */

export interface BreathingPhase {
  /** Unique id for this phase within a cycle */
  id: string;
  /** Label shown in the center of the circle (e.g. "Inspire") */
  label: string;
  /** Duration of this phase in seconds */
  durationSec: number;
  /** Visual behaviour: grow = circle expands, hold = stays, shrink = contracts */
  animation: "grow" | "hold" | "shrink";
}

export interface BreathingConfig {
  /** Discriminator — tells the dispatcher to use BreathingRunner */
  runner: "breathing";
  /** Total number of cycles (e.g. 4 for beginners, 8 for advanced) */
  cycles: number;
  /** Ordered phases within each cycle */
  phases: BreathingPhase[];
  /** Optional Spotify playlist URL (opens externally) */
  spotifyUrl?: string;
  /** Enable built-in sounds */
  sounds?: {
    /** Play a bell/chime at start and end */
    bell?: boolean;
    /** Play a soft breath guide synced with inhale/exhale */
    breathGuide?: boolean;
  };
  /** Activity introduction text */
  introduction?: string;
  /** Disclaimer text */
  disclaimer?: string;
  /** Duration in minutes (display only) */
  duration_min?: number;
}
