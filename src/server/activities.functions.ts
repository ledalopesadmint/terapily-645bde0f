/**
 * Server functions de atividades (S3) — atribuição, listagem, aplicação
 * presencial e revogação.
 *
 * Regras críticas (mem://features/activity-modes-and-link-duration):
 *  - delivery_mode TEM que estar em activity.config.supported_modes.
 *  - Em shared_link, a janela de expiração é limitada por tier do workspace.
 *  - Em in_session puro, NÃO geramos token (terapeuta aplica direto).
 *  - patient_activities NUNCA é deletado — só status='revoked' + token zerado.
 *  - Token armazenado como SHA-256, original devolvido UMA vez ao terapeuta.
 *  - Vínculo obrigatório: workspace + patient + therapist + activity + pa.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  generateMagicLinkToken,
  hashMagicLinkToken,
} from "@/lib/tokens/magic-link.server";
import {
  scoreActivity,
  type Severity,
} from "@/lib/scoring/scoring.server";
import { encryptPHIServer } from "@/lib/crypto/encryption.server";

// ----------------------------------------------------------------
// Tier → janela máxima de shared_link (em horas)
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

// In_session "patient holds my device" é fixo
const IN_SESSION_LINK_HOURS = 1;

// ----------------------------------------------------------------
// Tipos públicos
// ----------------------------------------------------------------
export type DeliveryMode = "in_session" | "shared_link" | "both";

export interface AssignActivityResult {
  patient_activity_id: string;
  delivery_mode: DeliveryMode;
  raw_token: string | null; // só preenchido se shared_link/in_session com link
  expires_at: string | null;
  link_path: string | null; // ex: /p/<token>
}

export interface PatientActivityRow {
  id: string;
  activity_id: string;
  activity_slug: string;
  activity_title: string;
  activity_archetype: string;
  delivery_mode: DeliveryMode;
  status: string;
  created_at: string;
  applied_at: string | null;
  used_at: string | null;
  token_expires_at: string | null;
  token_first_opened_at: string | null;
  token_open_count: number;
  has_active_link: boolean;
  response: {
    id: string;
    score: number | null;
    severity: Severity | null;
    submitted_at: string;
    has_clinical_flag: boolean;
  } | null;
}

// ----------------------------------------------------------------
// Schemas Zod
// ----------------------------------------------------------------
const AssignSchema = z
  .object({
    patient_id: z.string().uuid(),
    activity_id: z.string().uuid(),
    delivery_mode: z.enum(["in_session", "shared_link", "both"]),
    expires_in_hours: z.number().int().positive().max(24 * 30).optional(),
  })
  .strict();

const PatientIdSchema = z.object({ patient_id: z.string().uuid() }).strict();

const PatientActivityIdSchema = z
  .object({ patient_activity_id: z.string().uuid() })
  .strict();

const RecordResponseSchema = z
  .object({
    patient_activity_id: z.string().uuid(),
    responses: z.record(z.string().min(1).max(64), z.union([z.number(), z.string(), z.boolean(), z.null()])),
  })
  .strict();

const RevokeSchema = z
  .object({
    patient_activity_id: z.string().uuid(),
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
async function getWorkspaceTier(workspaceId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("tier")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data?.tier ?? "trial";
}

function detectClinicalFlag(
  config: any,
  responses: Record<string, unknown>,
): { raised: boolean; flag: string | null; item_id: string | null } {
  const items = Array.isArray(config?.items) ? config.items : [];
  for (const item of items) {
    if (!item?.clinical_flag) continue;
    const threshold = typeof item.flag_threshold === "number" ? item.flag_threshold : 1;
    const raw = responses[item.id];
    if (typeof raw === "number" && raw >= threshold) {
      return { raised: true, flag: item.clinical_flag, item_id: item.id };
    }
  }
  return { raised: false, flag: null, item_id: null };
}

// ================================================================
// 1. assignActivity — prescrever ou aplicar
// ================================================================
export const assignActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignSchema.parse(input))
  .handler(async ({ data, context }): Promise<AssignActivityResult> => {
    const { supabase, userId } = context;

    // 1. Carrega o paciente (RLS já garante que userId pode ver)
    const { data: patient, error: patientErr } = await supabase
      .from("patients")
      .select("id, workspace_id, assigned_therapist_id, deleted_at")
      .eq("id", data.patient_id)
      .maybeSingle();

    if (patientErr || !patient) {
      throw new Error("Paciente não encontrado.");
    }
    if (patient.deleted_at) {
      throw new Error("Não é possível atribuir atividade a um paciente excluído.");
    }

    // 2. Carrega a atividade (precisa estar publicada)
    const { data: activity, error: actErr } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, slug, title, archetype, status, config")
      .eq("id", data.activity_id)
      .maybeSingle();

    if (actErr || !activity) {
      throw new Error("Atividade não encontrada.");
    }
    if (activity.status !== "published") {
      throw new Error("Esta atividade ainda não está publicada.");
    }

    // 3. Gating de modo
    const supportedModes: string[] = Array.isArray(
      (activity.config as any)?.supported_modes,
    )
      ? (activity.config as any).supported_modes
      : ["in_session", "shared_link", "both"];

    // Pra in_session puro ou both → precisa supportar in_session
    // Pra shared_link puro → precisa supportar shared_link
    const required: string[] =
      data.delivery_mode === "shared_link"
        ? ["shared_link"]
        : data.delivery_mode === "both"
          ? ["in_session", "shared_link"]
          : ["in_session"];

    const ok = required.every((mode) => supportedModes.includes(mode));
    if (!ok) {
      const reason =
        (activity.config as any)?.restricted_reason ??
        "Esta atividade não pode ser entregue nesse modo.";
      throw new Error(reason);
    }

    // 4. Decide se gera token (apenas se shared_link envolvido)
    const needsToken = data.delivery_mode !== "in_session";
    let rawToken: string | null = null;
    let tokenHash: string | null = null;
    let tokenExpiresAt: string | null = null;

    if (needsToken) {
      // Valida janela contra o tier
      const tier = await getWorkspaceTier(patient.workspace_id);
      const defaultHours = TIER_LINK_DEFAULT_HOURS[tier] ?? 24;
      const maxHours = TIER_LINK_MAX_HOURS[tier] ?? 24;
      const hours = data.expires_in_hours ?? defaultHours;

      if (hours > maxHours) {
        throw new Error(
          `Seu plano permite no máximo ${maxHours}h de duração para o link.`,
        );
      }

      rawToken = generateMagicLinkToken();
      tokenHash = await hashMagicLinkToken(rawToken);
      tokenExpiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    }

    // 5. Insert (RLS valida workspace + assigned_by = auth.uid())
    const { data: pa, error: insertErr } = await supabase
      .from("patient_activities")
      .insert({
        workspace_id: patient.workspace_id,
        patient_id: patient.id,
        activity_id: activity.id,
        assigned_by: userId,
        delivery_mode: data.delivery_mode,
        status: "pending",
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
      })
      .select("id")
      .single();

    if (insertErr || !pa) {
      throw new Error(`Falha ao atribuir atividade: ${insertErr?.message ?? "desconhecido"}`);
    }

    return {
      patient_activity_id: pa.id,
      delivery_mode: data.delivery_mode,
      raw_token: rawToken,
      expires_at: tokenExpiresAt,
      link_path: rawToken ? `/p/${rawToken}` : null,
    };
  });

// ================================================================
// 2. generateInSessionLink — link 1h, paciente segura o celular do terapeuta
// ================================================================
export const generateInSessionLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PatientActivityIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ raw_token: string; expires_at: string; link_path: string }> => {
    const { supabase } = context;

    const { data: pa, error } = await supabase
      .from("patient_activities")
      .select("id, status, used_at")
      .eq("id", data.patient_activity_id)
      .maybeSingle();

    if (error || !pa) {
      throw new Error("Atividade do paciente não encontrada.");
    }
    if (pa.used_at) {
      throw new Error("Esta atividade já foi respondida.");
    }
    if (pa.status === "revoked" || pa.status === "completed") {
      throw new Error("Esta atividade não está disponível.");
    }

    const rawToken = generateMagicLinkToken();
    const tokenHash = await hashMagicLinkToken(rawToken);
    const expiresAt = new Date(Date.now() + IN_SESSION_LINK_HOURS * 3600 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from("patient_activities")
      .update({
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        delivery_mode: "shared_link",
      })
      .eq("id", pa.id);

    if (updateErr) {
      throw new Error(`Falha ao gerar link: ${updateErr.message}`);
    }

    return {
      raw_token: rawToken,
      expires_at: expiresAt,
      link_path: `/p/${rawToken}`,
    };
  });

// ================================================================
// 3. recordInSessionResponse — terapeuta aplicou ao vivo, salva resposta
// ================================================================
export const recordInSessionResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecordResponseSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ response_id: string; score: number | null; severity: Severity; clinical_flag: { raised: boolean; flag: string | null } }> => {
    const { supabase, userId } = context;

    const { data: pa, error: paErr } = await supabase
      .from("patient_activities")
      .select("id, workspace_id, patient_id, activity_id, used_at, status")
      .eq("id", data.patient_activity_id)
      .maybeSingle();

    if (paErr || !pa) {
      throw new Error("Atividade do paciente não encontrada.");
    }
    if (pa.used_at) {
      throw new Error("Esta atividade já foi respondida.");
    }
    if (pa.status === "revoked") {
      throw new Error("Esta atividade foi revogada.");
    }

    const { data: activity, error: actErr } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, archetype, config")
      .eq("id", pa.activity_id)
      .single();

    if (actErr || !activity) {
      throw new Error("Atividade não encontrada no catálogo.");
    }

    // Score
    const result = scoreActivity(activity.archetype, activity.config, data.responses);
    const flag = detectClinicalFlag(activity.config, data.responses);

    // Cifra respostas brutas
    const encrypted = await encryptPHIServer(JSON.stringify(data.responses));

    // Insert response (via admin — RLS bloqueia INSERT do client nessa tabela)
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
          clinical_flag: flag.raised
            ? { flag: flag.flag, item_id: flag.item_id }
            : null,
        },
        raw_responses_encrypted: encrypted,
        submitted_via: "in_session",
      })
      .select("id")
      .single();

    if (respErr || !response) {
      throw new Error(`Falha ao salvar resposta: ${respErr?.message ?? "desconhecido"}`);
    }

    // Marca patient_activity como usado/aplicado
    const nowIso = new Date().toISOString();
    await supabase
      .from("patient_activities")
      .update({
        status: "completed",
        used_at: nowIso,
        applied_at: nowIso,
        response_id: response.id,
        token_hash: null, // queima o token se havia
        token_expires_at: null,
      })
      .eq("id", pa.id);

    // Audit do clinical flag (não tem trigger automático pra isso)
    if (flag.raised) {
      await supabaseAdmin.from("audit_logs").insert({
        actor_id: userId,
        workspace_id: pa.workspace_id,
        action: "clinical_flag.raised",
        resource_type: "activity_response",
        resource_id: response.id,
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
      response_id: response.id,
      score: result.score,
      severity: result.severity,
      clinical_flag: { raised: flag.raised, flag: flag.flag },
    };
  });

// ================================================================
// 4. revokeActivity — invalida link/atividade pendente
// ================================================================
export const revokeActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RevokeSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context;

    const { data: pa } = await supabase
      .from("patient_activities")
      .select("id, used_at, status")
      .eq("id", data.patient_activity_id)
      .maybeSingle();

    if (!pa) throw new Error("Atividade do paciente não encontrada.");
    if (pa.used_at) throw new Error("Atividade já respondida — não pode ser revogada.");
    if (pa.status === "completed" || pa.status === "revoked") {
      throw new Error("Atividade já encerrada.");
    }

    const { error } = await supabase
      .from("patient_activities")
      .update({
        status: "revoked",
        token_hash: null,
        token_expires_at: null,
      })
      .eq("id", data.patient_activity_id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================================================================
// 5. getPatientActivities — lista pra aba "Atividades" do perfil
// ================================================================
export const getPatientActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PatientIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<PatientActivityRow[]> => {
    const { supabase } = context;

    const { data: rows, error } = await supabase
      .from("patient_activities")
      .select(
        `
        id,
        activity_id,
        delivery_mode,
        status,
        created_at,
        applied_at,
        used_at,
        token_expires_at,
        token_first_opened_at,
        token_open_count,
        token_hash,
        response_id,
        activity:activity_catalog ( slug, title, archetype ),
        response:activity_responses!patient_activities_response_id_fkey ( id, score, severity, submitted_at, scoring_metadata )
      `,
      )
      .eq("patient_id", data.patient_id)
      .order("created_at", { ascending: false });

    if (error) {
      // FK pode não existir formalmente — fallback sem o join
      const { data: fallback, error: fbErr } = await supabase
        .from("patient_activities")
        .select(
          `
          id, activity_id, delivery_mode, status, created_at, applied_at,
          used_at, token_expires_at, token_first_opened_at, token_open_count,
          token_hash, response_id,
          activity:activity_catalog ( slug, title, archetype )
        `,
        )
        .eq("patient_id", data.patient_id)
        .order("created_at", { ascending: false });
      if (fbErr) throw new Error(fbErr.message);

      const responseIds = (fallback ?? [])
        .map((r) => r.response_id)
        .filter((v): v is string => !!v);
      const responses = responseIds.length
        ? (
            await supabase
              .from("activity_responses")
              .select("id, score, severity, submitted_at, scoring_metadata")
              .in("id", responseIds)
          ).data ?? []
        : [];
      const respMap = new Map(responses.map((r) => [r.id, r]));

      const now = Date.now();
      return (fallback ?? []).map((r): PatientActivityRow => {
        const act = (r.activity as any) ?? {};
        const resp = r.response_id ? respMap.get(r.response_id) : null;
        const flagged =
          !!(resp?.scoring_metadata as any)?.clinical_flag?.flag;
        const hasActiveLink =
          !!r.token_hash &&
          !!r.token_expires_at &&
          new Date(r.token_expires_at).getTime() > now &&
          !r.used_at;
        return {
          id: r.id,
          activity_id: r.activity_id,
          activity_slug: act.slug ?? "",
          activity_title: act.title ?? "",
          activity_archetype: act.archetype ?? "",
          delivery_mode: r.delivery_mode as DeliveryMode,
          status: r.status,
          created_at: r.created_at,
          applied_at: r.applied_at,
          used_at: r.used_at,
          token_expires_at: r.token_expires_at,
          token_first_opened_at: r.token_first_opened_at,
          token_open_count: r.token_open_count ?? 0,
          has_active_link: hasActiveLink,
          response: resp
            ? {
                id: resp.id,
                score: resp.score,
                severity: (resp.severity as Severity) ?? null,
                submitted_at: resp.submitted_at,
                has_clinical_flag: flagged,
              }
            : null,
        };
      });
    }

    const now = Date.now();
    return (rows ?? []).map((r): PatientActivityRow => {
      const act = (r.activity as any) ?? {};
      const resp = (r.response as any) ?? null;
      const flagged =
        !!(resp?.scoring_metadata as any)?.clinical_flag?.flag;
      const hasActiveLink =
        !!r.token_hash &&
        !!r.token_expires_at &&
        new Date(r.token_expires_at).getTime() > now &&
        !r.used_at;
      return {
        id: r.id,
        activity_id: r.activity_id,
        activity_slug: act.slug ?? "",
        activity_title: act.title ?? "",
        activity_archetype: act.archetype ?? "",
        delivery_mode: r.delivery_mode as DeliveryMode,
        status: r.status,
        created_at: r.created_at,
        applied_at: r.applied_at,
        used_at: r.used_at,
        token_expires_at: r.token_expires_at,
        token_first_opened_at: r.token_first_opened_at,
        token_open_count: r.token_open_count ?? 0,
        has_active_link: hasActiveLink,
        response: resp
          ? {
              id: resp.id,
              score: resp.score,
              severity: (resp.severity as Severity) ?? null,
              submitted_at: resp.submitted_at,
              has_clinical_flag: flagged,
            }
          : null,
      };
    });
  });

// ================================================================
// 6. getTierLinkLimits — UI usa pra montar dropdown de duração
// ================================================================
export const getTierLinkLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspace_id: z.string().uuid() }).strict().parse(input),
  )
  .handler(async ({ data }): Promise<{ tier: string; default_hours: number; max_hours: number; allowed_options_hours: number[] }> => {
    const tier = await getWorkspaceTier(data.workspace_id);
    const defaultHours = TIER_LINK_DEFAULT_HOURS[tier] ?? 24;
    const maxHours = TIER_LINK_MAX_HOURS[tier] ?? 24;
    const allOptions = [24, 48, 24 * 7, 24 * 14, 24 * 30];
    return {
      tier,
      default_hours: defaultHours,
      max_hours: maxHours,
      allowed_options_hours: allOptions.filter((h) => h <= maxHours),
    };
  });
