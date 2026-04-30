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
import {
  generateMagicLinkToken,
  hashMagicLinkToken,
} from "@/lib/tokens/magic-link.server";
import {
  getActivePatientForWorkspace,
  getActivityFromCatalog,
} from "./activities.server";
import { encryptPHIServer } from "@/lib/crypto/encryption.server";
import { scoreActivity, type Severity } from "@/lib/scoring/scoring.server";

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

/**
 * Detecta clinical flag em respostas (PHQ-9 item 9, etc.).
 * Lê `clinical_flag` + `flag_threshold` (default 1) de cada item do config.
 * Sem PHI: só inspeciona valores numéricos das respostas.
 */
function detectClinicalFlag(
  config: unknown,
  responses: Record<string, unknown>,
): { raised: boolean; flag: string | null; item_id: string | null } {
  const items = Array.isArray((config as { items?: unknown[] })?.items)
    ? ((config as { items: unknown[] }).items)
    : [];
  for (const item of items) {
    const it = item as { id?: string; clinical_flag?: string; flag_threshold?: number };
    if (!it?.clinical_flag || !it.id) continue;
    const threshold = typeof it.flag_threshold === "number" ? it.flag_threshold : 1;
    const raw = responses[it.id];
    if (typeof raw === "number" && raw >= threshold) {
      return { raised: true, flag: it.clinical_flag, item_id: it.id };
    }
  }
  return { raised: false, flag: null, item_id: null };
}

// --- assignActivity --------------------------------------------------------

const AssignSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  activityId: z.string().uuid(),
  deliveryMode: z.enum(["in_session", "shared_link", "both"]),
  // Expiração do link (em horas). Default 7d. Só usado se delivery envolve link.
  expiresInHours: z.number().int().min(1).max(24 * 30).default(24 * 7),
});

export const assignActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 1. Confirma membership + paciente vivo no workspace
    const patient = await getActivePatientForWorkspace(
      data.patientId,
      data.workspaceId,
    );
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

    // 4. Gera token só se delivery envolve link
    let rawToken: string | null = null;
    let tokenHash: string | null = null;
    let tokenExpiresAt: string | null = null;
    const needsLink =
      data.deliveryMode === "shared_link" || data.deliveryMode === "both";

    if (needsLink) {
      rawToken = generateMagicLinkToken();
      tokenHash = await hashMagicLinkToken(rawToken);
      tokenExpiresAt = new Date(
        Date.now() + data.expiresInHours * 60 * 60 * 1000,
      ).toISOString();
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
      })
      .eq("id", pa.id);

    if (updErr) {
      console.error("[revokeActivity] update failed", { code: updErr.code });
      throw new Error("Não foi possível revogar a atividade.");
    }

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
        token_expires_at,
        token_first_opened_at,
        used_at,
        applied_at,
        created_at,
        activity:activity_catalog!inner ( id, slug, title, archetype ),
        response:activity_responses!patient_activities_response_fk ( id, score, severity, submitted_at )
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

    const statuses: ("draft" | "published")[] = includeDrafts ? ["published", "draft"] : ["published"];
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

    // Sem nenhuma atividade, retornamos vazio sem consultar audit_logs.
    if (paIds.length === 0) {
      return { logs: [] as AuditLogRow[] };
    }

    const { data: logs, error: logsErr } = await supabase
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, metadata, created_at, actor_id")
      .in("action", ACTIVITY_AUDIT_ACTIONS as unknown as string[])
      .in("resource_id", paIds)
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
  metadata: { [x: string]: {} };
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
