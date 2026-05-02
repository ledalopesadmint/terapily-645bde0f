/**
 * Server functions PÚBLICAS de autosave (paciente sem sessão).
 *
 * Constraints (magic-link-rules-locked + activity-drafts-s3):
 *  - Vínculo obrigatório: 1 draft por patient_activity_id (UNIQUE).
 *  - Conteúdo cifrado AES-256-GCM com PHI_ENCRYPTION_KEY.
 *  - expires_at = patient_activities.token_expires_at.
 *  - Se token expirado / usado / revogado / inválido → mensagem neutra.
 *  - Token NUNCA é logado (nem raw nem hash).
 *  - Rate limit: 10 req/min por IP, 5 req/min por token.
 *  - Audit via trigger SECURITY DEFINER (sem PHI).
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";
import {
  encryptPHIServer,
  decryptPHIServer,
} from "@/lib/crypto/encryption.server";
import { hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import { getPatientActivityByTokenHash } from "./activities.server";
import { checkPublicLinkRateLimit } from "@/lib/rate-limit/public-link.server";
import { activityLog, logStatusTransition } from "@/lib/logging/activity-logger.server";

const NEUTRAL_ERROR =
  "Este link não está disponível. Peça um novo link ao seu terapeuta.";

class PublicLinkError extends Error {
  constructor() {
    super(NEUTRAL_ERROR);
    this.name = "PublicLinkError";
  }
}

function logDraftFailure(reason: string) {
  console.warn("[activity-draft] denied", { reason });
}

function getClientIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

/**
 * Resolve hash + valida token. Retorna `pa` se OK, ou throw PublicLinkError.
 * NÃO bumpa contadores nem muda status — isso é responsabilidade do resolve público.
 */
async function loadActiveActivityByToken(rawToken: string) {
  const tokenHash = await hashMagicLinkToken(rawToken);
  const pa = await getPatientActivityByTokenHash(tokenHash);

  if (!pa) {
    logDraftFailure("not_found");
    throw new PublicLinkError();
  }
  if (pa.status === "revoked") {
    logDraftFailure("revoked");
    throw new PublicLinkError();
  }
  if (pa.used_at) {
    logDraftFailure("already_used");
    throw new PublicLinkError();
  }
  if (
    !pa.token_expires_at ||
    new Date(pa.token_expires_at).getTime() < Date.now()
  ) {
    logDraftFailure("expired");
    throw new PublicLinkError();
  }
  return pa;
}

const TokenSchema = z.string().min(16).max(256);

// --- saveActivityDraft -----------------------------------------------------

const SaveSchema = z.object({
  token: TokenSchema,
  // shape interno depende da escala — não validamos aqui.
  draft: z.record(z.string().min(1).max(64), z.unknown()),
  completionPercent: z.number().int().min(0).max(100),
});

export const saveActivityDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    await checkPublicLinkRateLimit({
      ip,
      tokenHash: await hashMagicLinkToken(data.token),
      bucket: "draft_save",
    });

    const pa = await loadActiveActivityByToken(data.token);
    const log = activityLog(pa.id);

    const encrypted = await encryptPHIServer(JSON.stringify(data.draft));

    // Upsert por patient_activity_id (UNIQUE).
    const { error } = await withRetry(() =>
      supabaseAdmin
        .from("activity_drafts")
        .upsert(
          {
            patient_activity_id: pa.id,
            workspace_id: pa.workspace_id,
            patient_id: pa.patient_id,
            draft_encrypted: encrypted,
            completion_percent: data.completionPercent,
            expires_at: pa.token_expires_at!,
          },
          { onConflict: "patient_activity_id" },
        ),
    );

    if (error) {
      log.error("draft.save_failed", { code: error.code });
      throw new PublicLinkError();
    }

    log.info("draft.saved", {
      completionPercent: data.completionPercent,
      status: pa.status,
    });

    // Update patient_activities status to in_progress on first save
    if (pa.status === "pending") {
      const { error: statusError } = await withRetry(() =>
        supabaseAdmin
          .from("patient_activities")
          .update({ status: "in_progress" })
          .eq("id", pa.id)
          .eq("status", "pending"),
      );

      if (statusError) {
        log.error("draft.status_update_failed", { code: statusError.code });
        // Non-blocking: draft saved successfully, status update is best-effort
      } else {
        logStatusTransition(pa.id, "pending", "in_progress", { trigger: "first_draft_save" });
      }
    }

    return { ok: true, completionPercent: data.completionPercent };
  });

// --- getActivityDraft ------------------------------------------------------

const GetSchema = z.object({ token: TokenSchema });

export const getActivityDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    await checkPublicLinkRateLimit({
      ip,
      tokenHash: await hashMagicLinkToken(data.token),
      bucket: "draft_load",
    });

    const pa = await loadActiveActivityByToken(data.token);
    const log = activityLog(pa.id);

    const { data: draft, error } = await withRetry(() =>
      supabaseAdmin
        .from("activity_drafts")
        .select("draft_encrypted, completion_percent, updated_at")
        .eq("patient_activity_id", pa.id)
        .maybeSingle(),
    );

    if (error) {
      log.error("draft.load_failed", { code: error.code });
      throw new PublicLinkError();
    }
    if (!draft) {
      log.info("draft.load_empty");
      return { hasDraft: false as const };
    }

    let decoded: Record<string, unknown>;
    try {
      const plain = await decryptPHIServer(draft.draft_encrypted);
      decoded = JSON.parse(plain) as Record<string, unknown>;
    } catch {
      log.warn("draft.decrypt_failed");
      return { hasDraft: false as const };
    }

    log.info("draft.loaded", {
      completionPercent: draft.completion_percent,
    });

    // Audit explícito de load (trigger só cobre INSERT/UPDATE/DELETE).
    await supabaseAdmin.from("audit_logs").insert({
      workspace_id: pa.workspace_id,
      action: "activity.draft_loaded",
      resource_type: "activity_draft",
      resource_id: pa.id,
      metadata: {
        patient_id: pa.patient_id,
        patient_activity_id: pa.id,
        completion_percent: draft.completion_percent,
      } as never,
    });

    return {
      hasDraft: true as const,
      draftJson: JSON.stringify(decoded),
      completionPercent: draft.completion_percent,
      updatedAt: draft.updated_at,
    };
  });

// --- discardActivityDraft --------------------------------------------------

const DiscardSchema = z.object({ token: TokenSchema });

export const discardActivityDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DiscardSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    await checkPublicLinkRateLimit({
      ip,
      tokenHash: await hashMagicLinkToken(data.token),
      bucket: "draft_discard",
    });

    const pa = await loadActiveActivityByToken(data.token);
    const log = activityLog(pa.id);

    const { error } = await supabaseAdmin
      .from("activity_drafts")
      .delete()
      .eq("patient_activity_id", pa.id);

    if (error) {
      log.error("draft.discard_failed", { code: error.code });
      throw new PublicLinkError();
    }

    log.info("draft.discarded");

    return { ok: true };
  });
