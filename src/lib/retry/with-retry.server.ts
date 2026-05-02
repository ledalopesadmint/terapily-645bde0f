/**
 * Retry helper for transient proxy/DB 500 errors.
 *
 * Supabase calls occasionally fail with HTTP 500 from the PostgREST
 * proxy (e.g. connection reset, cold start). This helper retries the
 * operation up to `maxAttempts` times with exponential back-off before
 * propagating the error to the frontend.
 *
 * Use for read/idempotent DB operations. For writes, only wrap when the
 * operation is idempotent (upsert) or protected by a database constraint
 * (unique index, used_at IS NULL guard, etc.).
 */

export interface RetryOptions {
  /** Max total attempts (including first). Default 3. */
  maxAttempts?: number;
  /** Base delay in ms (doubles each retry). Default 300. */
  baseDelayMs?: number;
  /** Custom predicate: return true to retry, false to throw immediately. */
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 300,
  shouldRetry: isTransientError,
};

/**
 * Detects transient errors worth retrying:
 * - Supabase PostgREST error objects with status 500-599
 * - Fetch/network errors (TypeError "fetch failed", "network error")
 * - Generic Error messages containing "500", "502", "503", "504", "ECONNRESET"
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;

  // Supabase client returns { code, message, details, hint, status }
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;

    // PostgREST status code
    if (typeof obj.status === "number" && obj.status >= 500 && obj.status < 600) {
      return true;
    }
    // Some errors carry statusCode instead
    if (typeof obj.statusCode === "number" && obj.statusCode >= 500 && obj.statusCode < 600) {
      return true;
    }
    // Supabase error code string like "PGRST301" (connection pool)
    if (typeof obj.code === "string" && /^PGRST3/.test(obj.code)) {
      return true;
    }
  }

  // Network / fetch errors
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("econnreset")) {
      return true;
    }
  }

  // Generic error message patterns
  if (err instanceof Error) {
    const msg = err.message;
    if (/\b(500|502|503|504|ECONNRESET|ETIMEDOUT|socket hang up)\b/i.test(msg)) {
      return true;
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute `fn` with automatic retry on transient failures.
 *
 * ```ts
 * const data = await withRetry(() => supabaseAdmin.from("x").select("*"));
 * ```
 */
export async function withRetry<T>(
  fn: () => T | Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, shouldRetry } = { ...DEFAULT_OPTS, ...opts };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      // Supabase client doesn't throw on query errors — it returns { data, error }.
      // Detect and potentially retry 500-class query errors.
      if (
        result &&
        typeof result === "object" &&
        "error" in (result as Record<string, unknown>) &&
        (result as Record<string, unknown>).error
      ) {
        const queryError = (result as Record<string, unknown>).error;
        if (attempt < maxAttempts && shouldRetry(queryError)) {
          console.warn(
            `[withRetry] Supabase query error on attempt ${attempt}/${maxAttempts}, retrying...`,
            { code: (queryError as Record<string, unknown>).code },
          );
          lastError = queryError;
          await sleep(baseDelayMs * Math.pow(2, attempt - 1));
          continue;
        }
      }

      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && shouldRetry(err)) {
        console.warn(
          `[withRetry] Transient error on attempt ${attempt}/${maxAttempts}, retrying...`,
          { message: err instanceof Error ? err.message : String(err) },
        );
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
        continue;
      }
      throw err;
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}
