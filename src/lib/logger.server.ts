/**
 * Logger seguro para server functions / server routes.
 *
 * REGRA DURA (HIPAA + LGPD):
 *   - NUNCA logar objeto de erro inteiro do Postgres/Supabase. Os campos
 *     `details`, `hint`, `query`, `body` podem conter valores reais
 *     (display_name, email parcial, filtros WHERE com PHI...).
 *   - Logar APENAS: nome da operação, código sanitizado e mensagem genérica.
 *   - Se houver requestId / correlationId, ele entra no log — mas nunca PHI.
 *   - Não logar payloads, filtros, metadata com dados de paciente.
 *
 * Uso:
 *   logServerError("listPatients", error);
 *   logServerError("createPatient", error, { requestId });
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
    // Alguns erros do Supabase trazem `name` em vez de `code`.
    const name = (err as { name?: unknown }).name;
    if (typeof name === "string" && ALLOWED_CODE.test(name)) return name;
    return "unknown";
  }
  // Whitelist estrita: só caracteres seguros, tamanho limitado.
  // Códigos PG são tipo "23505", "42P01"; códigos Supabase tipo "PGRST116".
  return ALLOWED_CODE.test(raw) ? raw : "unknown";
}

export interface LogContext {
  requestId?: string | null;
  correlationId?: string | null;
}

/**
 * Log estruturado de erro de operação. Formato fixo, sem PHI.
 */
export function logServerError(
  operation: string,
  err: unknown,
  ctx: LogContext = {},
): void {
  const code = safeCode(err as AnyError);
  const correlation = ctx.correlationId ?? ctx.requestId ?? null;

  // JSON line — fácil de varrer no painel de logs e impossível de
  // injetar payload arbitrário (só campos enumerados aqui).
  // `message` e `hint` são SEMPRE strings constantes — nunca vêm do erro
  // do Postgres/Supabase, que pode ter PHI em `details`/`hint`/`query`.
  console.error(
    JSON.stringify({
      level: "error",
      op: operation,
      code,
      message: "operation failed",
      hint: "see audit_logs and operation code for context",
      ...(correlation ? { correlation_id: correlation } : {}),
    }),
  );
}
