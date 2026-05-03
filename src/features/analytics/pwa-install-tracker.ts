/**
 * PWA Install Tracker — client-side only.
 *
 * Tracks `beforeinstallprompt` (eligible) and `appinstalled` events.
 * Sends anonymous metrics to audit_logs via server function (fire-and-forget).
 * Zero PHI — only device_type (mobile/desktop/tablet) by UA heuristic.
 *
 * Usage: call `initPwaInstallTracker()` once in root component (useEffect).
 */

import { trackPwaEvent } from "./analytics.functions";

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

let initialized = false;

export function initPwaInstallTracker() {
  if (initialized) return;
  if (typeof window === "undefined") return;

  // Guard: don't track inside iframes or on preview hosts
  try {
    if (window.self !== window.top) return;
  } catch {
    return; // cross-origin iframe
  }
  if (
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com")
  ) {
    return;
  }

  initialized = true;

  // beforeinstallprompt → device is eligible for install
  window.addEventListener("beforeinstallprompt", () => {
    void trackPwaEvent({
      data: { event: "eligible", deviceType: getDeviceType() },
    }).catch(() => {
      /* fire-and-forget */
    });
  });

  // appinstalled → user actually installed
  window.addEventListener("appinstalled", () => {
    void trackPwaEvent({
      data: { event: "installed", deviceType: getDeviceType() },
    }).catch(() => {
      /* fire-and-forget */
    });
  });
}
