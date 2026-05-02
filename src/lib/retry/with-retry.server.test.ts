/**
 * Tests for withRetry + isTransientError.
 *
 * Validates that:
 *  - Transient 500 errors are retried and eventually succeed.
 *  - Supabase-style { data, error } responses with 500 status are retried.
 *  - Non-transient errors (4xx, business logic) are thrown immediately.
 *  - Max attempts is respected and the last error is thrown.
 *  - Successful results pass through untouched.
 */

import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  isTransientError,
  type RetryOptions,
} from "./with-retry.server";

// Fast retries for tests
const FAST: RetryOptions = { maxAttempts: 3, baseDelayMs: 1 };

// ─── isTransientError ────────────────────────────────────────

describe("isTransientError", () => {
  it("detects PostgREST status 500", () => {
    expect(isTransientError({ status: 500, code: "PGRST000", message: "fail" })).toBe(true);
  });

  it("detects PostgREST status 502", () => {
    expect(isTransientError({ status: 502, message: "Bad Gateway" })).toBe(true);
  });

  it("detects statusCode variant (503)", () => {
    expect(isTransientError({ statusCode: 503 })).toBe(true);
  });

  it("detects PGRST3xx connection pool errors", () => {
    expect(isTransientError({ code: "PGRST301", message: "pool" })).toBe(true);
    expect(isTransientError({ code: "PGRST302", message: "pool" })).toBe(true);
  });

  it("detects TypeError fetch failed", () => {
    expect(isTransientError(new TypeError("fetch failed"))).toBe(true);
  });

  it("detects TypeError network error", () => {
    expect(isTransientError(new TypeError("network error"))).toBe(true);
  });

  it("detects ECONNRESET in Error message", () => {
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
  });

  it("detects ETIMEDOUT in Error message", () => {
    expect(isTransientError(new Error("ETIMEDOUT"))).toBe(true);
  });

  it("detects socket hang up", () => {
    expect(isTransientError(new Error("socket hang up"))).toBe(true);
  });

  it("detects '500' in error message", () => {
    expect(isTransientError(new Error("Server returned 500"))).toBe(true);
  });

  // Non-transient
  it("rejects 400 status", () => {
    expect(isTransientError({ status: 400, message: "Bad Request" })).toBe(false);
  });

  it("rejects 404 status", () => {
    expect(isTransientError({ status: 404 })).toBe(false);
  });

  it("rejects PGRST116 (no rows)", () => {
    expect(isTransientError({ code: "PGRST116", message: "no rows" })).toBe(false);
  });

  it("rejects regular Error without transient keywords", () => {
    expect(isTransientError(new Error("Paciente não encontrado"))).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});

// ─── withRetry: thrown errors ────────────────────────────────

describe("withRetry — thrown errors", () => {
  it("succeeds on first try when no error", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, FAST);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient 500 and succeeds on 2nd attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Server returned 500"))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, FAST);
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on transient TypeError and succeeds on 3rd attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, FAST);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on non-transient error (no retry)", async () => {
    const err = new Error("Paciente não encontrado");
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn, FAST)).rejects.toThrow("Paciente não encontrado");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after max attempts exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("502 Bad Gateway"));

    await expect(withRetry(fn, FAST)).rejects.toThrow("502 Bad Gateway");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─── withRetry: Supabase { data, error } responses ──────────

describe("withRetry — Supabase query error objects", () => {
  it("retries when error has status 500 and succeeds", async () => {
    const failResponse = {
      data: null,
      error: { status: 500, code: "PGRST000", message: "internal" },
    };
    const okResponse = { data: [{ id: "1" }], error: null };

    const fn = vi
      .fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValue(okResponse);

    const result = await withRetry(fn, FAST);
    expect(result).toEqual(okResponse);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries PGRST301 connection pool error and succeeds", async () => {
    const poolError = {
      data: null,
      error: { code: "PGRST301", message: "connection pool exhausted" },
    };
    const ok = { data: { id: "x" }, error: null };

    const fn = vi
      .fn()
      .mockResolvedValueOnce(poolError)
      .mockResolvedValueOnce(poolError)
      .mockResolvedValue(ok);

    const result = await withRetry(fn, FAST);
    expect(result).toEqual(ok);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("passes through Supabase error with status 400 (no retry)", async () => {
    const badRequest = {
      data: null,
      error: { status: 400, code: "PGRST100", message: "bad request" },
    };

    const fn = vi.fn().mockResolvedValue(badRequest);
    const result = await withRetry(fn, FAST);

    // Non-transient error is returned as-is (caller checks .error)
    expect(result).toEqual(badRequest);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns { data, error: null } without retrying on success", async () => {
    const ok = { data: [{ id: "1" }], error: null };
    const fn = vi.fn().mockResolvedValue(ok);

    const result = await withRetry(fn, FAST);
    expect(result).toEqual(ok);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exhausts retries on persistent 500 and returns last error response", async () => {
    const fail = {
      data: null,
      error: { status: 500, code: "PGRST000", message: "internal" },
    };

    const fn = vi.fn().mockResolvedValue(fail);

    // On the last attempt, error is non-retryable (attempt === maxAttempts),
    // so the result with error is returned as-is.
    const result = await withRetry(fn, FAST);
    expect(result).toEqual(fail);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─── withRetry: mixed scenarios ──────────────────────────────

describe("withRetry — mixed scenarios", () => {
  it("uses custom shouldRetry predicate", async () => {
    const customOpts: RetryOptions = {
      maxAttempts: 3,
      baseDelayMs: 1,
      shouldRetry: (err) =>
        err instanceof Error && err.message.includes("CUSTOM_RETRY"),
    };

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("CUSTOM_RETRY"))
      .mockResolvedValue("done");

    const result = await withRetry(fn, customOpts);
    expect(result).toBe("done");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry with custom predicate that returns false", async () => {
    const customOpts: RetryOptions = {
      maxAttempts: 3,
      baseDelayMs: 1,
      shouldRetry: () => false,
    };

    const fn = vi.fn().mockRejectedValue(new Error("500 fail"));

    await expect(withRetry(fn, customOpts)).rejects.toThrow("500 fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("handles synchronous fn that returns a value", async () => {
    const fn = vi.fn().mockReturnValue(42);
    const result = await withRetry(fn, FAST);
    expect(result).toBe(42);
  });

  it("handles fn returning undefined (no error property)", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const result = await withRetry(fn, FAST);
    expect(result).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
