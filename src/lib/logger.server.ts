/**
 * Logger seguro para server functions / server routes.
 *
 * Re-exporta o helper universal de `./logger` com escopo `server`.
 * Mesmas regras HIPAA/LGPD: sem PHI, sem payload, só código sanitizado.
 *
 * Uso:
 *   logServerError("listPatients", error);
 *   logServerError("createPatient", error, { requestId });
 */

import { logSafeError, type LogContext } from "./logger";

export type { LogContext } from "./logger";

export function logServerError(
  operation: string,
  err: unknown,
  ctx: LogContext = {},
): void {
  logSafeError("server", operation, err, ctx);
}
