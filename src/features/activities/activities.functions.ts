/**
 * Server functions do terapeuta para patient_activities.
 *
 * Constraints aplicadas (magic-link-rules-locked):
 *  - Vínculo obrigatório workspace+patient+therapist+activity+patient_activity.
 *  - Token cru retornado UMA vez no assign; só hash persiste.
 *  - Revoke não apaga histórico; só invalida o link.
 *  - Submit marca used_at (single-use) e cria activity_responses cifrado.
 *  - Audit metadata NUNCA contém PHI (só UUIDs e enums).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordAudit } from "@/features/audit/audit.server";
import { generateMagicLinkToken, hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import { getActivePatientForWorkspace, getActivityFromCatalog } from "./activities.server";
import { encryptPHIServer, decryptPHIServer } from "@/lib/crypto/encryption.server";
import { scoreActivity, type Severity } from "@/lib/scoring/scoring.server";
import { detectClinicalFlag } from "@/server/clinical-flag.server";

// ----------------------------------------------------------------
// Tier → janela de shared_link (em horas)
// Ver mem://features/activity-modes-and-link-duration
// ----------------------------------------------------------------
const TIER_LINK_DEFAULT_HOURS: Record<string, number> = {
  trial: 24,
  solo: 24,
  basic: 48,
  practice: 24 * 7,
  clinic: 24 * 7,
};

const TIER_LINK_MAX_HOURS: Record<string, number> = {
  trial: 24,
  solo: 24,
  basic: 24 * 7,
  practice: 24 * 14,
  clinic: 24 * 30,
};

// In-session "patient holds my device" → link de 1h fixo, não-configurável.
const IN_SESSION_LINK_HOURS = 1;

async function getWorkspaceTier(workspaceId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("tier")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data?.tier ?? "trial";
}

// --- assignActivity --------------------------------------------------------

const AssignSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  activityId: z.string().uuid(),
  deliveryMode: z.enum(["in_session", "shared_link", "both"]),
  // Expiração do link (em horas). Default 7d. Só usado se delivery envolve link.
  expiresInHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(24 * 7),
});

export const assignActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 1. Confirma membership + paciente vivo no workspace
    const patient = await getActivePatientForWorkspace(data.patientId, data.workspaceId);
    if (!patient) {
      throw new Error("Paciente não encontrado neste workspace.");
    }

    // 2. Valida atividade publicada (drafts liberados se preview ligado)
    const activity = await getActivityFromCatalog(data.activityId);
    if (!activity) {
      throw new Error("Atividade indisponível.");
    }
    if (activity.status !== "published") {
      const { data: previewFlag } = await supabaseAdmin.rpc("has_feature", {
        _workspace_id: data.workspaceId,
        _flag: "library_selection_preview",
      });
      if (!previewFlag) {
        throw new Error("Atividade indisponível.");
      }
    }

    // 3. Membership + permissão de prescrição (terapeuta atribuído OU owner)
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!membership) throw new Error("Sem permissão neste workspace.");

    const isOwner = membership.role === "owner";
    const isAssigned = patient.assigned_therapist_id === userId;
    if (!isOwner && !isAssigned) {
      throw new Error("Sem permissão pra prescrever atividades pra este paciente.");
    }

    // 3.5. Gating de modo: a atividade declara `supported_modes` no config.
    //      PHQ-9/PCL-5/C-SSRS = ["in_session"]; demais = ambos.
    //      Ver mem://features/activity-modes-and-link-duration
    const supportedModes: string[] = Array.isArray(
      (activity.config as { supported_modes?: unknown })?.supported_modes,
    )
      ? (activity.config as { supported_modes: string[] }).supported_modes
      : ["in_session", "shared_link", "both"];

    const requiredModes: string[] =
      data.deliveryMode === "shared_link"
        ? ["shared_link"]
        : data.deliveryMode === "both"
          ? ["in_session", "shared_link"]
          : ["in_session"];

    if (!requiredModes.every((m) => supportedModes.includes(m))) {
      const reason =
        (activity.config as { restricted_reason?: string })?.restricted_reason ??
        "Esta atividade não pode ser entregue nesse modo.";
      throw new Error(reason);
    }

    // 4. Gera token só se delivery envolve link
    //
    // REGRA DE CONSTRAINT (documentar, não alterar):
    //   - delivery_mode = "in_session" → token_hash PODE ser null (paciente usa
    //     o dispositivo do terapeuta, sem link externo).
    //   - delivery_mode = "shared_link" → token_hash OBRIGATÓRIO (acesso via magic link).
    //   - delivery_mode = "both" → token_hash gerado (terapeuta aplica E prescreve).
    //   - generateShareLink() (abaixo) pode transformar uma atividade in_session em
    //     shared_link ao gerar link posteriormente — nesse caso token_hash é preenchido
    //     e delivery_mode atualizado.
    //
    let rawToken: string | null = null;
    let tokenHash: string | null = null;
    let tokenExpiresAt: string | null = null;
    const needsLink = data.deliveryMode === "shared_link" || data.deliveryMode === "both";

    if (needsLink) {
      // Gating de tier: clamp da janela de expiração ao máximo do plano.
      const tier = await getWorkspaceTier(data.workspaceId);
      const maxHours = TIER_LINK_MAX_HOURS[tier] ?? 24;
      const clampedHours = Math.min(data.expiresInHours, maxHours);

      rawToken = generateMagicLinkToken(activity.slug);
      tokenHash = await hashMagicLinkToken(rawToken);
      tokenExpiresAt = new Date(Date.now() + clampedHours * 60 * 60 * 1000).toISOString();
    }

    // 5. Insert via service role (consistência sem depender da policy de insert,
    //    mas mantendo o vínculo obrigatório explícito).
    const { data: created, error } = await supabaseAdmin
      .from("patient_activities")
      .insert({
        workspace_id: data.workspaceId,
        patient_id: data.patientId,
        assigned_by: userId,
        activity_id: data.activityId,
        delivery_mode: data.deliveryMode,
        status: "pending",
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
        token_sent_at: needsLink ? new Date().toISOString() : null,
      })
      .select("id, status, delivery_mode, token_expires_at, created_at")
      .single();

    if (error || !created) {
      // Não logamos PHI nem token. Erro é genérico pra UI.
      console.error("[assignActivity] insert failed", { code: error?.code });
      throw new Error("Não foi possível criar a atividade.");
    }

    // 6. Retorna o token cru SOMENTE aqui. Nunca mais será exposto.
    return {
      id: created.id,
      status: created.status,
      deliveryMode: created.delivery_mode,
      expiresAt: created.token_expires_at,
      // token cru — só é mostrado uma vez
      rawToken,
    };
  });

// --- revokeActivity --------------------------------------------------------

const RevokeSchema = z.object({
  patientActivityId: z.string().uuid(),
  reason: z.string().trim().max(200).optional(),
});

export const revokeActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RevokeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Busca a atividade
    const { data: pa, error: paErr } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id, assigned_by, status, used_at")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (paErr || !pa) throw new Error("Atividade não encontrada.");

    // Permissão: assigned_by OU owner do workspace
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    const isOwner = membership?.role === "owner";
    if (!isOwner && pa.assigned_by !== userId) {
      throw new Error("Sem permissão pra revogar esta atividade.");
    }

    if (pa.used_at) {
      throw new Error("Esta atividade já foi respondida e não pode ser revogada.");
    }

    if (pa.status === "revoked") {
      return { id: pa.id, status: "revoked" as const, alreadyRevoked: true };
    }

    // Revoga: invalida o link (zera hash) mas mantém histórico (id, vínculos, etc.)
    const { error: updErr } = await supabaseAdmin
      .from("patient_activities")
      .update({
        status: "revoked",
        token_hash: null,
        token_expires_at: null,
        revocation_reason: data.reason || null,
      })
      .eq("id", pa.id);

    if (updErr) {
      console.error("[revokeActivity] update failed", { code: updErr.code });
      throw new Error("Não foi possível revogar a atividade.");
    }

    // Audit nominal: além do trigger automático de status_changed, registramos
    // um evento dedicado `activity.revoked` com o actor explícito. Sem PHI.
    await recordAudit({
      actorId: userId,
      workspaceId: pa.workspace_id,
      action: "activity.revoked",
      resourceType: "patient_activity",
      resourceId: pa.id,
      metadata: {
        previous_status: pa.status,
        ...(data.reason ? { reason: data.reason } : {}),
      },
    });

    return { id: pa.id, status: "revoked" as const, alreadyRevoked: false };
  });

// --- listPatientActivities -------------------------------------------------

const ListSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const listPatientActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSchema.parse(input))
  .handler(async ({ data, context }) => {
    // RLS via client autenticado garante isolamento.
    const { supabase } = context;

    const { data: rows, error } = await supabase
      .from("patient_activities")
      .select(
        `
        id,
        delivery_mode,
        status,
        revocation_reason,
        token_expires_at,
        token_first_opened_at,
        used_at,
        applied_at,
        created_at,
        activity:activity_catalog!inner ( id, slug, title, archetype ),
        response:activity_responses!patient_activities_response_fk ( id, score, severity, scoring_metadata, submitted_via, submitted_at, acknowledged_at, acknowledged_by )
      `,
      )
      .eq("patient_id", data.patientId)
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listPatientActivities] failed", { code: error.code });
      throw new Error("Não foi possível carregar as atividades.");
    }

    // Enriquece com info de draft (sem PHI: só completion_percent + flag).
    // Permite a UI mostrar "Em andamento · 60%" sem decifrar nada.
    const ids = (rows ?? []).map((r) => r.id);
    let draftMap = new Map<string, { percent: number; updatedAt: string }>();
    if (ids.length > 0) {
      const { data: drafts, error: draftErr } = await supabase
        .from("activity_drafts")
        .select("patient_activity_id, completion_percent, updated_at")
        .in("patient_activity_id", ids);
      if (draftErr) {
        console.warn("[listPatientActivities] draft enrich failed", { code: draftErr.code });
      } else {
        draftMap = new Map(
          (drafts ?? []).map((d) => [
            d.patient_activity_id,
            { percent: d.completion_percent ?? 0, updatedAt: d.updated_at },
          ]),
        );
      }
    }

    const activities = (rows ?? []).map((r) => {
      const draft = draftMap.get(r.id);
      return {
        ...r,
        has_draft: !!draft,
        draft_completion_percent: draft?.percent ?? null,
        draft_updated_at: draft?.updatedAt ?? null,
      };
    });

    return { activities };
  });

// --- listAvailableActivities ----------------------------------------------

const ListAvailableSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

export const listAvailableActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListAvailableSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Se a flag library_selection_preview estiver ligada pro workspace,
    // drafts também aparecem (preview interno enquanto o player não chegou).
    let includeDrafts = false;
    if (data.workspaceId) {
      const { data: flagOn } = await supabase.rpc("has_feature", {
        _workspace_id: data.workspaceId,
        _flag: "library_selection_preview",
      });
      includeDrafts = Boolean(flagOn);
    }

    const statuses: ("draft" | "published")[] = includeDrafts
      ? ["published", "draft"]
      : ["published"];
    const { data: rows, error } = await supabase
      .from("activity_catalog")
      .select("id, slug, title, archetype, short_description, category, status, theme, config")
      .in("status", statuses)
      .order("title", { ascending: true });

    if (error) {
      console.error("[listAvailableActivities] failed", { code: error.code });
      throw new Error("Não foi possível carregar o catálogo.");
    }
    return { activities: rows ?? [], includeDrafts };
  });

// --- getMyWorkspaceRole (gating client-side de Tabs owner-only) -----------

const RoleSchema = z.object({ workspaceId: z.string().uuid() });

export const getMyWorkspaceRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[getMyWorkspaceRole] failed", { code: error.code });
      return { role: null as null };
    }
    return { role: (row?.role ?? null) as "owner" | "therapist" | null };
  });

// --- listPatientAuditLogs (owner only) ------------------------------------
// RLS de audit_logs já restringe leitura a `has_workspace_role(_, owner)`.
// Aqui só filtramos por paciente (resource_id) e por ações relevantes a S3.

const AuditListSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  limit: z.number().int().min(1).max(200).default(50),
});

const ACTIVITY_AUDIT_ACTIONS = [
  "activity.assigned",
  "activity.share_intent",
  "activity.link_opened",
  "activity.draft_saved",
  "activity.draft_loaded",
  "activity.draft_discarded",
  "activity.submitted",
  "activity.status_changed",
  "activity.response_recorded",
  "activity.revoked",
  "compliance_report.generated",
  "patient.contact_revealed",
  "clinical_flag.raised",
  "clinical_flag.resolved",
  "clinical_flag.acknowledged",
] as const;

export const listPatientAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AuditListSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1. Audits ligados a patient_activities deste paciente.
    //    Buscamos os IDs primeiro (RLS já garante visibilidade do paciente).
    const { data: pas, error: paErr } = await supabase
      .from("patient_activities")
      .select("id")
      .eq("patient_id", data.patientId)
      .eq("workspace_id", data.workspaceId);

    if (paErr) {
      console.error("[listPatientAuditLogs] pa lookup failed", { code: paErr.code });
      throw new Error("Não foi possível carregar a auditoria.");
    }
    const paIds = (pas ?? []).map((p) => p.id);

    const responseIds: string[] = [];
    if (paIds.length > 0) {
      const { data: responses, error: responseErr } = await supabase
        .from("activity_responses")
        .select("id")
        .eq("patient_id", data.patientId)
        .eq("workspace_id", data.workspaceId);

      if (responseErr) {
        console.error("[listPatientAuditLogs] response lookup failed", { code: responseErr.code });
        throw new Error("Não foi possível carregar a auditoria.");
      }
      responseIds.push(...(responses ?? []).map((r) => r.id));
    }

    const resourceIds = Array.from(new Set([...paIds, ...responseIds, data.patientId]));

    const { data: logs, error: logsErr } = await supabase
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, metadata, created_at, actor_id")
      .in("action", ACTIVITY_AUDIT_ACTIONS as unknown as string[])
      .in("resource_id", resourceIds)
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (logsErr) {
      // Se RLS recusou (terapeuta não-owner), devolve vazio em vez de vazar erro.
      if (logsErr.code === "PGRST301" || logsErr.code === "42501") {
        return { logs: [] as AuditLogRow[], denied: true };
      }
      console.error("[listPatientAuditLogs] audit_logs failed", { code: logsErr.code });
      throw new Error("Não foi possível carregar a auditoria.");
    }

    return { logs: (logs ?? []) as AuditLogRow[] };
  });

// --- recordShareIntent -----------------------------------------------------
// Registra a INTENÇÃO de compartilhar o link via canal externo do terapeuta
// (WhatsApp / SMS / mailto / clipboard). NÃO confirma envio — só registra
// que o terapeuta clicou no botão. Sem PHI no metadata: só UUIDs e enum.
// Substitui o antigo `activity.email_sent`.
// Ver `mem://constraint/no-automated-email-policy`.

const ShareIntentSchema = z.object({
  patientActivityId: z.string().uuid(),
  channel: z.enum(["whatsapp", "sms", "mailto", "copy"]),
});

export const recordShareIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShareIntentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: pa, error } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id, assigned_by")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (error || !pa) return { ok: false as const };

    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    const isOwner = membership?.role === "owner";
    if (!isOwner && pa.assigned_by !== userId) {
      return { ok: false as const };
    }

    await recordAudit({
      actorId: userId,
      workspaceId: pa.workspace_id,
      action: "activity.share_intent",
      resourceType: "patient_activity",
      resourceId: pa.id,
      metadata: { channel: data.channel },
    });

    return { ok: true as const };
  });

export interface AuditLogRow {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  // Casamos com o tipo inferido pelo Supabase Generated (jsonb).
  metadata: { [x: string]: NonNullable<unknown> };
  created_at: string;
  actor_id: string | null;
}

// --- getActivityShareSummary ----------------------------------------------
// Agrega audit_logs com action='activity.share_intent' para um lote de
// patient_activities. Retorna, por id: total de compartilhamentos, contagem
// por canal e timestamp do último share. Sem PHI — só UUIDs, enums e datas.
//
// Usado no mini-resumo da aba "Atividades" do paciente. Por isso o input é
// um array de patient_activity ids (uma chamada serve a aba inteira).
//
// Permissão: RLS de audit_logs já restringe SELECT a admin OU owner do
// workspace. Terapeuta comum recebe array vazio (sem erro). É consistente
// com a aba de Auditoria.

const ShareSummarySchema = z.object({
  workspaceId: z.string().uuid(),
  patientActivityIds: z.array(z.string().uuid()).min(0).max(200),
});

export interface ShareChannelCounts {
  whatsapp: number;
  sms: number;
  mailto: number;
  copy: number;
}

export interface ShareSummaryRow {
  patientActivityId: string;
  total: number;
  byChannel: ShareChannelCounts;
  lastSharedAt: string | null;
}

export const getActivityShareSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShareSummarySchema.parse(input))
  .handler(async ({ data, context }) => {
    const empty = (): Record<string, ShareSummaryRow> => ({});

    if (data.patientActivityIds.length === 0) {
      return { summaries: empty() };
    }

    const { supabase } = context;

    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("resource_id, metadata, created_at")
      .eq("workspace_id", data.workspaceId)
      .eq("action", "activity.share_intent")
      .in("resource_id", data.patientActivityIds)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      // RLS recusou (terapeuta não-owner) → silencia, devolve vazio.
      // É o mesmo comportamento de listPatientAuditLogs.
      if (error.code === "PGRST301" || error.code === "42501") {
        return { summaries: empty() };
      }
      console.error("[getActivityShareSummary] failed", { code: error.code });
      return { summaries: empty() };
    }

    const summaries: Record<string, ShareSummaryRow> = {};
    for (const id of data.patientActivityIds) {
      summaries[id] = {
        patientActivityId: id,
        total: 0,
        byChannel: { whatsapp: 0, sms: 0, mailto: 0, copy: 0 },
        lastSharedAt: null,
      };
    }

    for (const log of logs ?? []) {
      const id = log.resource_id;
      if (!id || !summaries[id]) continue;
      const row = summaries[id];
      row.total += 1;
      const channel = (log.metadata as { channel?: string } | null)?.channel;
      if (
        channel === "whatsapp" ||
        channel === "sms" ||
        channel === "mailto" ||
        channel === "copy"
      ) {
        row.byChannel[channel] += 1;
      }
      // logs vêm DESC por created_at → o primeiro encontrado é o mais recente.
      if (!row.lastSharedAt) {
        row.lastSharedAt = log.created_at;
      }
    }

    return { summaries };
  });

// ============================================================
// generateInSessionLink — link 1h fixo (paciente segura o
// device do terapeuta na sessão). Não-configurável.
// ============================================================
const GenInSessionSchema = z.object({
  patientActivityId: z.string().uuid(),
});

export const generateInSessionLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenInSessionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: pa, error } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id, assigned_by, activity_id, status, used_at")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (error || !pa) throw new Error("Atividade não encontrada.");
    if (pa.used_at) throw new Error("Esta atividade já foi respondida.");
    if (pa.status === "revoked" || pa.status === "completed") {
      throw new Error("Esta atividade não está disponível.");
    }

    // Permissão: assigned_by OU owner
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    const isOwner = membership?.role === "owner";
    if (!isOwner && pa.assigned_by !== userId) {
      throw new Error("Sem permissão para gerar link desta atividade.");
    }

    // Busca slug da atividade pra URL amigável
    const catalogEntry = await getActivityFromCatalog(pa.activity_id);
    const rawToken = generateMagicLinkToken(catalogEntry?.slug);
    const tokenHash = await hashMagicLinkToken(rawToken);
    const expiresAt = new Date(Date.now() + IN_SESSION_LINK_HOURS * 3600 * 1000).toISOString();

    const { error: updErr } = await supabaseAdmin
      .from("patient_activities")
      .update({
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        token_sent_at: new Date().toISOString(),
        delivery_mode: "shared_link",
      })
      .eq("id", pa.id);

    if (updErr) {
      console.error("[generateInSessionLink] update failed", { code: updErr.code });
      throw new Error("Não foi possível gerar o link.");
    }

    return {
      rawToken,
      expiresAt,
      linkPath: `/p/${rawToken}`,
    };
  });

// ============================================================
// recordInSessionResponse — terapeuta aplicou ao vivo.
// Score + cifra de PHI + Mauve flag (PHQ-9 item 9, etc.).
// ============================================================
const RecordResponseSchema = z.object({
  patientActivityId: z.string().uuid(),
  responses: z.record(
    z.string().min(1).max(64),
    z.union([
      z.number(),
      z.string(),
      z.boolean(),
      z.null(),
      z.array(z.unknown()),
      z.record(z.string(), z.unknown()),
    ]),
  ),
});

export const recordInSessionResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecordResponseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: pa, error: paErr } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id, patient_id, activity_id, assigned_by, used_at, status")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (paErr || !pa) throw new Error("Atividade não encontrada.");
    if (pa.used_at) throw new Error("Esta atividade já foi respondida.");
    if (pa.status === "revoked") throw new Error("Esta atividade foi revogada.");

    // Permissão: assigned_by OU owner
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    const isOwner = membership?.role === "owner";
    if (!isOwner && pa.assigned_by !== userId) {
      throw new Error("Sem permissão para registrar resposta desta atividade.");
    }

    const { data: activity, error: actErr } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, archetype, config")
      .eq("id", pa.activity_id)
      .single();

    if (actErr || !activity) throw new Error("Atividade não encontrada no catálogo.");

    // Score + Mauve flag
    const result = scoreActivity(activity.archetype, activity.config, data.responses);
    const flag = detectClinicalFlag(activity.config, data.responses);

    // Cifra respostas brutas (PHI). raw_responses_encrypted nunca em log/URL.
    const encrypted = await encryptPHIServer(JSON.stringify(data.responses));

    const { data: response, error: respErr } = await supabaseAdmin
      .from("activity_responses")
      .insert({
        workspace_id: pa.workspace_id,
        patient_id: pa.patient_id,
        patient_activity_id: pa.id,
        activity_id: pa.activity_id,
        score: result.score,
        severity: result.severity === "not_applicable" ? null : result.severity,
        scoring_metadata: {
          ...result.metadata,
          clinical_flag: flag.raised ? { flag: flag.flag, item_id: flag.item_id } : null,
        },
        raw_responses_encrypted: encrypted,
        submitted_via: "in_session",
      })
      .select("id")
      .single();

    if (respErr || !response) {
      console.error("[recordInSessionResponse] insert failed", { code: respErr?.code });
      throw new Error("Não foi possível salvar a resposta.");
    }

    // Marca patient_activity como aplicado + queima token se houver
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("patient_activities")
      .update({
        status: "completed",
        used_at: nowIso,
        applied_at: nowIso,
        response_id: response.id,
        token_hash: null,
        token_expires_at: null,
      })
      .eq("id", pa.id);

    // Audit nominal de Mauve flag (PHI-safe: só UUIDs e enum).
    if (flag.raised) {
      await recordAudit({
        actorId: userId,
        workspaceId: pa.workspace_id,
        action: "clinical_flag.raised",
        resourceType: "activity_response",
        resourceId: response.id,
        metadata: {
          patient_id: pa.patient_id,
          activity_id: pa.activity_id,
          flag: flag.flag,
          item_id: flag.item_id,
          submitted_via: "in_session",
        },
      });
    }

    return {
      responseId: response.id,
      score: result.score,
      severity: result.severity,
      clinicalFlag: { raised: flag.raised, flag: flag.flag },
    };
  });

// ============================================================
// getTierLinkLimits — UI usa pra montar dropdown de duração
// filtrado por tier do workspace.
// ============================================================
const TierLimitsSchema = z.object({ workspaceId: z.string().uuid() });

export const getTierLinkLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TierLimitsSchema.parse(input))
  .handler(async ({ data }) => {
    const tier = await getWorkspaceTier(data.workspaceId);
    const defaultHours = TIER_LINK_DEFAULT_HOURS[tier] ?? 24;
    const maxHours = TIER_LINK_MAX_HOURS[tier] ?? 24;
    const allOptions = [24, 48, 24 * 7, 24 * 14, 24 * 30];
    return {
      tier,
      defaultHours,
      maxHours,
      allowedOptionsHours: allOptions.filter((h) => h <= maxHours),
    };
  });

// ============================================================
// getActivityResponseDetail — decifra respostas on-demand
// pra o drawer "Ver respostas" no perfil do paciente.
// Audit: patient.contact_revealed? Não — aqui é resposta
// de atividade, não PHI de contato. Mas logamos igualmente.
// ============================================================
const ResponseDetailSchema = z.object({
  responseId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const getActivityResponseDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResponseDetailSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: resp, error } = await supabaseAdmin
      .from("activity_responses")
      .select(
        "id, workspace_id, patient_id, activity_id, patient_activity_id, score, severity, scoring_metadata, raw_responses_encrypted, submitted_at, submitted_via",
      )
      .eq("id", data.responseId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (error || !resp) throw new Error("Resposta não encontrada.");

    // Permissão: workspace member + (assigned therapist OU owner)
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", resp.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!membership) throw new Error("Sem permissão.");

    const isOwner = membership.role === "owner";
    if (!isOwner) {
      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("assigned_therapist_id")
        .eq("id", resp.patient_id)
        .eq("workspace_id", resp.workspace_id)
        .maybeSingle();
      if (patient?.assigned_therapist_id !== userId) {
        throw new Error("Sem permissão para ver esta resposta.");
      }
    }

    // Decifra
    let decryptedResponses: { [x: string]: NonNullable<unknown> } = {};
    if (resp.raw_responses_encrypted) {
      try {
        const plain = await decryptPHIServer(resp.raw_responses_encrypted);
        decryptedResponses = JSON.parse(plain) as { [x: string]: NonNullable<unknown> };
      } catch {
        throw new Error("Não foi possível decifrar as respostas.");
      }
    }

    // Busca config da atividade pra UI renderizar labels
    const { data: activity } = await supabaseAdmin
      .from("activity_catalog")
      .select("title, config, archetype")
      .eq("id", resp.activity_id)
      .maybeSingle();

    // Audit
    await recordAudit({
      actorId: userId,
      workspaceId: resp.workspace_id,
      action: "activity.response_viewed",
      resourceType: "activity_response",
      resourceId: resp.id,
      metadata: {
        patient_id: resp.patient_id,
        patient_activity_id: resp.patient_activity_id,
      },
    });

    return {
      id: resp.id,
      score: resp.score,
      severity: resp.severity,
      scoringMetadata: resp.scoring_metadata,
      submittedAt: resp.submitted_at,
      submittedVia: resp.submitted_via,
      responses: decryptedResponses,
      activity: activity
        ? { title: activity.title, config: activity.config, archetype: activity.archetype }
        : null,
    };
  });

// ============================================================
// getActivityConfig — terapeuta busca config de uma atividade
// do catálogo pra renderizar o player in_session.
// ============================================================
const ActivityConfigSchema = z.object({
  patientActivityId: z.string().uuid(),
});

export const getActivityConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivityConfigSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: pa, error } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id, activity_id, assigned_by, used_at, status")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (error || !pa) throw new Error("Atividade não encontrada.");
    if (pa.used_at) throw new Error("Esta atividade já foi respondida.");
    if (pa.status === "revoked") throw new Error("Esta atividade foi revogada.");

    // Permissão
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    const isOwner = membership?.role === "owner";
    if (!isOwner && pa.assigned_by !== userId) {
      throw new Error("Sem permissão.");
    }

    const activity = await getActivityFromCatalog(pa.activity_id);
    if (!activity) throw new Error("Atividade não encontrada no catálogo.");

    return {
      patientActivityId: pa.id,
      activity: {
        title: activity.title,
        archetype: activity.archetype,
        config: activity.config,
      },
    };
  });

// ============================================================
// acknowledgeClinicalFlag — terapeuta reconhece flag clínica.
// Marca acknowledged_at/acknowledged_by no activity_response.
// Audit: clinical_flag.acknowledged
// ============================================================
const AcknowledgeFlagSchema = z.object({
  responseId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const acknowledgeClinicalFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AcknowledgeFlagSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verifica que a response existe e pertence ao workspace
    const { data: resp, error } = await supabaseAdmin
      .from("activity_responses")
      .select("id, workspace_id, patient_id, activity_id, scoring_metadata, acknowledged_at")
      .eq("id", data.responseId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (error || !resp) throw new Error("Resposta não encontrada.");
    if (resp.acknowledged_at) throw new Error("Flag já foi reconhecida.");

    // Permissão: workspace member
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", resp.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!membership) throw new Error("Sem permissão.");

    const isOwner = membership.role === "owner";
    if (!isOwner) {
      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("assigned_therapist_id")
        .eq("id", resp.patient_id)
        .eq("workspace_id", resp.workspace_id)
        .maybeSingle();
      if (patient?.assigned_therapist_id !== userId) {
        throw new Error("Sem permissão para reconhecer esta flag.");
      }
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("activity_responses")
      .update({ acknowledged_at: now, acknowledged_by: userId })
      .eq("id", resp.id);

    await recordAudit({
      actorId: userId,
      workspaceId: resp.workspace_id,
      action: "clinical_flag.acknowledged",
      resourceType: "activity_response",
      resourceId: resp.id,
      metadata: {
        patient_id: resp.patient_id,
        activity_id: resp.activity_id,
      },
    });

    return { acknowledged: true };
  });

// ── Authenticated draft save/load (in-session) ─────────────────────────

const SaveDraftAuthSchema = z.object({
  patientActivityId: z.string().uuid(),
  draft: z.record(z.string().min(1).max(64), z.unknown()),
  completionPercent: z.number().int().min(0).max(100),
});

export const saveInSessionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveDraftAuthSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verify ownership
    const { data: pa, error: paErr } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id, patient_id, status, used_at, delivery_mode")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (paErr || !pa) throw new Error("Atividade não encontrada.");
    if (pa.used_at) throw new Error("Atividade já foi respondida.");
    if (pa.status === "revoked") throw new Error("Atividade revogada.");

    // Check workspace membership
    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!member) throw new Error("Sem permissão.");

    const encrypted = await encryptPHIServer(JSON.stringify(data.draft));

    const draftPayload = {
      workspace_id: pa.workspace_id,
      patient_id: pa.patient_id,
      draft_encrypted: encrypted,
      completion_percent: data.completionPercent,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data: updatedDraft, error: updateError } = await supabaseAdmin
      .from("activity_drafts")
      .update(draftPayload)
      .eq("patient_activity_id", pa.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[saveInSessionDraft] update failed", { code: updateError.code });
      throw new Error("Não foi possível salvar rascunho.");
    }

    if (!updatedDraft) {
      const { error: insertError } = await supabaseAdmin.from("activity_drafts").insert({
        patient_activity_id: pa.id,
        ...draftPayload,
      });

      if (insertError) {
        console.error("[saveInSessionDraft] insert failed", { code: insertError.code });
        throw new Error("Não foi possível salvar rascunho.");
      }
    }

    // Transition status to in_progress if still pending
    if (pa.status === "pending") {
      await supabaseAdmin
        .from("patient_activities")
        .update({ status: "in_progress" })
        .eq("id", pa.id);
    }

    return { ok: true };
  });

const LoadDraftAuthSchema = z.object({
  patientActivityId: z.string().uuid(),
});

export const loadInSessionDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LoadDraftAuthSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: pa } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id, used_at, status")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (!pa) return { hasDraft: false as const };
    if (pa.used_at || pa.status === "revoked") return { hasDraft: false as const };

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!member) return { hasDraft: false as const };

    const { data: draft } = await supabaseAdmin
      .from("activity_drafts")
      .select("draft_encrypted, completion_percent, updated_at")
      .eq("patient_activity_id", pa.id)
      .maybeSingle();

    if (!draft) return { hasDraft: false as const };

    try {
      const plain = await decryptPHIServer(draft.draft_encrypted);
      const decoded = JSON.parse(plain) as Record<string, NonNullable<unknown>>;
      return {
        hasDraft: true as const,
        draft: decoded,
        completionPercent: draft.completion_percent,
        updatedAt: draft.updated_at,
      };
    } catch {
      return { hasDraft: false as const };
    }
  });

const DeleteDraftAuthSchema = z.object({
  patientActivityId: z.string().uuid(),
});

export const deleteInSessionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteDraftAuthSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: pa } = await supabaseAdmin
      .from("patient_activities")
      .select("id, workspace_id")
      .eq("id", data.patientActivityId)
      .maybeSingle();

    if (!pa) return { ok: true };

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", pa.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!member) return { ok: true };

    await supabaseAdmin.from("activity_drafts").delete().eq("patient_activity_id", pa.id);

    return { ok: true };
  });
