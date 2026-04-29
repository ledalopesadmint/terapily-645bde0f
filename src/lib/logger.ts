/**
 * Logger seguro UNIVERSAL (client + server).
 *
 * REGRA DURA (HIPAA + LGPD):
 *   - NUNCA logar objeto de erro inteiro do Postgres/Supabase. Os campos
 *     `details`, `hint`, `query`, `body` podem conter valores reais
 *     (display_name, email parcial, filtros WHERE com PHI...).
 *   - Logar APENAS: nome da operação, código sanitizado e mensagem genérica.
 *   - Se houver requestId / correlationId, ele entra no log — mas nunca PHI.
 *   - Não logar payloads, filtros, metadata com dados de paciente.
 *
 * Uso (client):
 *   import { logClientError } from "@/lib/logger";
 *   logClientError("featureFlag.check", err);
 *
 * Uso (server):
 *   import { logServerError } from "@/lib/logger.server";
 *   logServerError("createPatient", err, { requestId });
 *
 * Implementação central — server logger reusa este helper.
 */

const ALLOWED_CODE = /^[A-Za-z0-9_.\-]{1,32}$/;

type AnyError =
  | {
      code?: unknown;
      name?: unknown;
      // Campos potencialmente perigosos — IGNORADOS de propósito:
      //   message, details, hint, query, stack, body, response
    }
  | null
  | undefined;

function safeCode(err: AnyError): string {
  if (!err || typeof err !== "object") return "unknown";
  const raw = (err as { code?: unknown }).code;
  if (typeof raw !== "string") {
    const name = (err as { name?: unknown }).name;
    if (typeof name === "string" && ALLOWED_CODE.test(name)) return name;
    return "unknown";
  }
  return ALLOWED_CODE.test(raw) ? raw : "unknown";
}

export interface LogContext {
  requestId?: string | null;
  correlationId?: string | null;
}

/**
 * Log sanitizado pra erro de operação. Mesma assinatura no client e no server.
 * No client roda no console do browser; no server, no console do Worker.
 */
export function logSafeError(
  scope: "client" | "server",
  operation: string,
  err: unknown,
  ctx: LogContext = {},
): void {
  const code = safeCode(err as AnyError);
  const correlation = ctx.correlationId ?? ctx.requestId ?? null;

  console.error(
    JSON.stringify({
      level: "error",
      side: scope,
      op: operation,
      code,
      message: "operation failed",
      hint: "see audit_logs and operation code for context",
      ...(correlation ? { correlation_id: correlation } : {}),
    }),
  );
}

/**
 * Atalho client-safe. Use em hooks/componentes onde não pode importar
 * nada com sufixo `.server`.
 */
export function logClientError(
  operation: string,
  err: unknown,
  ctx: LogContext = {},
): void {
  logSafeError("client", operation, err, ctx);
}
