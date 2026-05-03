/**
 * Server functions PÚBLICAS para links efêmeros (/e/$token).
 *
 * Constraints (ephemeral-links-architecture):
 *  - Mensagem NEUTRA pra qualquer falha.
 *  - Token cru NUNCA logado.
 *  - response_data_encrypted purgado após 24h.
 *  - Dados efêmeros: EXPIRA O ACESSO → EXPIRA O DADO (24h).
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";
import { encryptPHIServer } from "@/lib/crypto/encryption.server";
import { hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import { checkPublicLinkRateLimit } from "@/lib/rate-limit/public-link.server";
import { getEphemeralActivityByTokenHash } from "./ephemeral.server";

function getClientIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

const NEUTRAL_ERROR =
  "Este link não está disponível. Peça um novo link ao seu terapeuta.";

class EphemeralLinkError extends Error {
  constructor() {
    super(NEUTRAL_ERROR);
    this.name = "EphemeralLinkError";
  }
}

// ----------------------------------------------------------------
// resolveEphemeralToken
// ----------------------------------------------------------------

const ResolveSchema = z.object({
  token: z.string().min(16).max(256),
});

export const resolveEphemeralToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResolveSchema.parse(input))
  .handler(async ({ data }) => {
    const tokenHash = await hashMagicLinkToken(data.token);
    await checkPublicLinkRateLimit({
      ip: getClientIp(),
      tokenHash,
      bucket: "resolve",
    });

    const ea = await getEphemeralActivityByTokenHash(tokenHash);

    if (!ea) {
      console.warn("[ephemeral-link] denied: not_found");
      throw new EphemeralLinkError();
    }

    // Check status
    if (ea.status === "revoked" || ea.status === "expired" || ea.status === "purged") {
      console.warn("[ephemeral-link] denied:", ea.status);
      throw new EphemeralLinkError();
    }

    if (ea.used_at) {
      console.warn("[ephemeral-link] denied: already_used");
      throw new EphemeralLinkError();
    }

    // Check expiration
    if (new Date(ea.token_expires_at) < new Date()) {
      // Mark as expired
      await supabaseAdmin
        .from("ephemeral_activities")
        .update({ status: "expired" })
        .eq("id", ea.id)
        .eq("status", "pending");
      console.warn("[ephemeral-link] denied: token_expired");
      throw new EphemeralLinkError();
    }

    // Track open
    const isFirstOpen = !ea.token_first_opened_at;
    await supabaseAdmin
      .from("ephemeral_activities")
      .update({
        token_open_count: (ea.token_open_count ?? 0) + 1,
        ...(isFirstOpen
          ? { token_first_opened_at: new Date().toISOString(), status: "opened" }
          : {}),
      })
      .eq("id", ea.id);

    // Fetch activity config
    const { data: activity } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, slug, title, archetype, config, short_description")
      .eq("id", ea.activity_id)
      .single();

    if (!activity) {
      throw new EphemeralLinkError();
    }

    return {
      ephemeralActivityId: ea.id,
      activityId: activity.id,
      activitySlug: activity.slug,
      activityTitle: activity.title,
      archetype: activity.archetype,
      config: activity.config,
      shortDescription: activity.short_description,
      workspaceId: ea.workspace_id,
      patientId: ea.patient_id,
    };
  });

// ----------------------------------------------------------------
// submitEphemeralResponse
// ----------------------------------------------------------------

const SubmitSchema = z.object({
  token: z.string().min(16).max(256),
  responses: z.record(z.unknown()),
  userAgent: z.string().max(500).optional(),
});

export const submitEphemeralResponse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitSchema.parse(input))
  .handler(async ({ data }) => {
    const tokenHash = await hashMagicLinkToken(data.token);
    await checkPublicLinkRateLimit({
      ip: getClientIp(),
      tokenHash,
      bucket: "submit",
    });

    const ea = await getEphemeralActivityByTokenHash(tokenHash);
    if (!ea) throw new EphemeralLinkError();

    // Must be pending or opened, not already used
    if (ea.used_at || ea.status === "completed" || ea.status === "revoked" || ea.status === "expired" || ea.status === "purged") {
      throw new EphemeralLinkError();
    }

    if (new Date(ea.token_expires_at) < new Date()) {
      throw new EphemeralLinkError();
    }

    const now = new Date();
    const purgeAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    // Encrypt response data
    const encrypted = await encryptPHIServer(JSON.stringify(data.responses));

    // Insert ephemeral response
    const { error: respError } = await withRetry(() =>
      supabaseAdmin.from("ephemeral_responses").insert({
        ephemeral_activity_id: ea.id,
        workspace_id: ea.workspace_id,
        patient_id: ea.patient_id,
        activity_id: ea.activity_id,
        response_data_encrypted: encrypted,
        submitted_at: now.toISOString(),
        submitted_via: ea.delivery_mode,
        submitted_ip: getClientIp(),
        submitted_user_agent: data.userAgent?.slice(0, 500) ?? null,
      }),
    );

    if (respError) throw new Error("Falha ao salvar resposta.");

    // Update ephemeral_activity: mark as completed, set purge_after
    await supabaseAdmin
      .from("ephemeral_activities")
      .update({
        status: "completed",
        used_at: now.toISOString(),
        completed_at: now.toISOString(),
        purge_after: purgeAfter.toISOString(),
      })
      .eq("id", ea.id);

    return {
      success: true,
      purgeAfter: purgeAfter.toISOString(),
    };
  });
