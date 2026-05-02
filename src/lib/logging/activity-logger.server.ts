/**
 * Structured logger for activity lifecycle events.
 *
 * Every log entry is a JSON object with:
 *  - `ctx`  — always "activity" (filterable)
 *  - `ev`   — event name (e.g. "resolve.ok", "draft.save", "status.transition")
 *  - `paId` — patient_activity_id (correlation key)
 *  - `ts`   — ISO timestamp
 *  - extra fields depending on the event
 *
 * CONSTRAINTS (HIPAA / magic-link-rules-locked):
 *  - NEVER log raw token, PHI, patient names, emails, or phones.
 *  - `paId` is a UUID (not PHI).
 *  - Workspace/patient/activity IDs are UUIDs (not PHI).
 *  - Log levels: info = expected flow, warn = recoverable issue, error = failure.
 */

export interface ActivityLogBase {
  ctx: "activity";
  ev: string;
  paId: string;
  ts: string;
  [key: string]: unknown;
}

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, entry: ActivityLogBase) {
  const msg = JSON.stringify(entry);
  switch (level) {
    case "error":
      console.error(msg);
      break;
    case "warn":
      console.warn(msg);
      break;
    default:
      console.log(msg);
  }
}

/**
 * Create a scoped logger bound to a specific patientActivityId.
 *
 * ```ts
 * const log = activityLog(pa.id);
 * log.info("resolve.ok", { status: pa.status });
 * log.warn("draft.save_retry", { attempt: 2 });
 * log.error("submit.insert_failed", { code: "PGRST301" });
 * ```
 */
export function activityLog(patientActivityId: string) {
  const base = {
    ctx: "activity" as const,
    paId: patientActivityId,
  };

  return {
    info(ev: string, extra?: Record<string, unknown>) {
      emit("info", { ...base, ev, ts: new Date().toISOString(), ...extra });
    },
    warn(ev: string, extra?: Record<string, unknown>) {
      emit("warn", { ...base, ev, ts: new Date().toISOString(), ...extra });
    },
    error(ev: string, extra?: Record<string, unknown>) {
      emit("error", { ...base, ev, ts: new Date().toISOString(), ...extra });
    },
  };
}

/**
 * Log a status transition (from → to) for a patient_activity.
 * Convenience wrapper — always info-level.
 */
export function logStatusTransition(
  patientActivityId: string,
  from: string,
  to: string,
  extra?: Record<string, unknown>,
) {
  activityLog(patientActivityId).info("status.transition", {
    from,
    to,
    ...extra,
  });
}
