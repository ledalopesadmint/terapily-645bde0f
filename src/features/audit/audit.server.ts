/**
 * Audit helper — Sexta da S1.
 *
 * `withAudit(action, fn)` envolve qualquer operação server-side com um
 * registro em `audit_logs` consistente.
 *
 * REGRA HARDENING (Terça da S1):
 *   `audit_logs` tem INSERT REVOKED para `authenticated` e `anon`. A única
 *   forma de gravar é via:
 *     1. Funções SECURITY DEFINER no banco (ex: trigger de subscriptions)
 *     2. `supabaseAdmin` (service_role) — usado AQUI
 *
 * REGRA PII:
 *   - Nunca enviar email, senha, tokens, conteúdo clínico, ou qualquer dado
 *     pessoal identificável dentro de `metadata`.
 *   - Use só metadados estruturais: nomes de campos alterados, IDs, contagens,
 *     enums (status, tier, role), timestamps.
 *
 * Uso típico dentro de uma server function:
 *
 *   import { withAudit } from "@/features/audit/audit.server";
 *
 *   const result = await withAudit(
 *     {
 *       actorId: userId,
 *       action: "profile.updated",
 *       resourceType: "profile",
 *       resourceId: userId,
 *       metadata: { fields: Object.keys(data) },
 *     },
 *     async () => {
 *       // ... mutação real (RLS aplica como o usuário) ...
 *       return updatedRow;
 *     }
 *   );
 */
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logServerError } from "@/lib/logger.server";

export interface AuditEntry {
  /** ID do usuário que disparou a ação (auth.uid). NULL apenas para sistema. */
  actorId: string | null;
  /** Workspace afetado (null para ações globais como signup). */
  workspaceId?: string | null;
  /** Convenção: "<resource>.<verb>" — ex: "profile.updated", "workspace.renamed". */
  action: string;
  /** Tipo do recurso (profile, workspace, subscription, member, etc). */
  resourceType?: string;
  /** ID do recurso afetado (string para suportar IDs não-uuid). */
  resourceId?: string;
  /**
   * Dados estruturais SEM PII. Exemplos OK:
   *   { fields: ["full_name", "country"] }
   *   { from: "trialing", to: "active" }
   *   { invitedRole: "therapist" }
   * NÃO COLOCAR: email, nome completo, telefone, conteúdo clínico, senhas.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Captura IP e User-Agent da request atual (best-effort, server-only).
 * IP via x-forwarded-for, primeiro hop. User-Agent direto do header.
 */
function captureRequestContext(): { ip: string | null; userAgent: string | null } {
  try {
    const userAgent = getRequestHeader("user-agent") ?? null;
    const forwarded = getRequestHeader("x-forwarded-for") ?? null;
    const ip = forwarded?.split(",")[0]?.trim() || null;
    return { ip, userAgent };
  } catch {
    // Fora de contexto de request (jobs em background) — sem problema.
    return { ip: null, userAgent: null };
  }
}

/**
 * Insere uma linha em audit_logs. Usado por `withAudit` e disponível
 * standalone para casos especiais (ex: registrar tentativa que falhou).
 *
 * NUNCA falha a operação principal — erros de audit são logados e ignorados.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const { ip, userAgent } = captureRequestContext();
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: entry.actorId,
      workspace_id: entry.workspaceId ?? null,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      metadata: (entry.metadata ?? {}) as never,
      ip,
      user_agent: userAgent,
    });
    if (error) {
      // Logger seguro: só action (enum) + código sanitizado.
      // Nunca incluir error.message/details/hint (pode vazar metadata).
      logServerError(`audit.insert.${entry.action}`, error);
    }
  } catch (err) {
    logServerError("audit.unexpected", err);
  }
}

/**
 * Envolve uma operação com audit log.
 *
 * - Se a operação tiver sucesso: grava o audit com a entry fornecida.
 * - Se falhar: re-lança o erro SEM gravar audit (regra: só registramos
 *   ações que efetivamente aconteceram). Para registrar tentativas
 *   falhas, chame `recordAudit` explicitamente no catch.
 */
export async function withAudit<T>(
  entry: AuditEntry,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await fn();
  // Audit roda em paralelo ao retorno — não bloqueia o handler.
  // Mas await pra garantir que erros aparecem nos logs do request.
  await recordAudit(entry);
  return result;
}

/**
 * Faz `schema.parse(input)`. Se Zod falhar, registra `validation.failed`
 * com a lista de campos inválidos (apenas NOMES — nunca os valores) e
 * relança o ZodError pra UI tratar normalmente.
 *
 * Uso típico (dentro do .handler, depois de obter userId via middleware):
 *
 *   const data = await parseOrAuditValidation(
 *     patientCreateSchema,
 *     input,
 *     { feature: "patients", actorId: userId, workspaceId },
 *   );
 *
 * Metadata gravado é PII-safe: só `feature` (string fixa) e `fields` (lista
 * de paths Zod). NUNCA inclui valores enviados pelo cliente.
 */
export async function parseOrAuditValidation<T>(
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ path: Array<string | number> }> } } },
  input: unknown,
  ctx: { feature: string; actorId: string | null; workspaceId?: string | null },
): Promise<T> {
  const result = schema.safeParse(input);
  if (result.success && result.data !== undefined) return result.data;

  // Extrai só o primeiro segmento do path de cada issue (campo top-level).
  // Dedup pra evitar repetição quando o mesmo campo tem múltiplos refinements.
  const fields = Array.from(
    new Set(
      (result.error?.issues ?? [])
        .map((i) => (i.path[0] !== undefined ? String(i.path[0]) : "<root>"))
        .filter(Boolean),
    ),
  );

  await recordAudit({
    actorId: ctx.actorId,
    workspaceId: ctx.workspaceId ?? null,
    action: "validation.failed",
    resourceType: ctx.feature,
    metadata: {
      feature: ctx.feature,
      fields,
    },
  });

  // Relança um Error com o mesmo formato Zod-friendly que o caller espera.
  // Não inclui valores enviados — apenas a lista de campos.
  const err = new Error(`Validation failed: ${fields.join(", ")}`);
  (err as Error & { issues?: unknown }).issues = result.error?.issues;
  throw err;
}

/**
 * Helper padrão pra ações de admin (Leda) — uso futuro em S3+:
 *   - publicação de atividade no catálogo
 *   - alteração de planos
 *   - alterações no catálogo Stripe (stripe_products)
 *
 * Convenção: action SEMPRE começa com `admin.` (enforçado).
 * Metadata segue mesma regra PII-safe das outras entradas.
 *
 * Não registra workspace_id porque a maior parte das ações admin é global.
 * Se houver workspace alvo, passe explicitamente via metadata.target_workspace_id.
 */
export async function recordAdminAction(
  adminUserId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  resource?: { type: string; id?: string },
): Promise<void> {
  if (!action.startsWith("admin.")) {
    throw new Error(`recordAdminAction: action must start with "admin." (got "${action}")`);
  }
  await recordAudit({
    actorId: adminUserId,
    workspaceId: null,
    action,
    resourceType: resource?.type,
    resourceId: resource?.id,
    metadata,
  });
}
