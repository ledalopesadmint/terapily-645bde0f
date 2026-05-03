/**
 * Server functions do terapeuta para ephemeral_activities.
 *
 * Constraints (ephemeral-links-architecture):
 *  - Consentimento obrigatório do terapeuta pra política de 24h.
 *  - Token cru retornado UMA vez no assign; só hash persiste.
 *  - Revoke não apaga histórico; só invalida o link.
 *  - PDF download é auditado (contagem + timestamp).
 *  - Audit metadata NUNCA contém PHI.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";
import { recordAudit } from "@/features/audit/audit.server";
import {
  generateMagicLinkToken,
  hashMagicLinkToken,
} from "@/lib/tokens/magic-link.server";
import {
  getActivePatientForWorkspace,
  getActivityFromCatalog,
} from "@/features/activities/activities.server";
import {
  EPHEMERAL_CONSENT_TEXT,
  listEphemeralActivitiesForPatient,
} from "./ephemeral.server";

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

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ----------------------------------------------------------------
// assignEphemeralActivity
// ----------------------------------------------------------------

const AssignEphemeralSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  activityId: z.string().uuid(),
  deliveryMode: z.enum(["in_session", "shared_link", "both"]).default("shared_link"),
  consentAcknowledged: z.literal(true),
  expiresInHours: z.number().int().min(1).max(24 * 30).default(48),
});

export const assignEphemeralActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignEphemeralSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 1. Validate patient + activity
    const patient = await getActivePatientForWorkspace(data.patientId, data.workspaceId);
    if (!patient) throw new Error("Paciente não encontrado ou excluído.");

    const activity = await getActivityFromCatalog(data.activityId);
    if (!activity || activity.status !== "published") {
      throw new Error("Atividade não encontrada ou indisponível.");
    }

    // 2. Generate token
    const rawToken = await generateMagicLinkToken(activity.slug);
    const tokenHash = await hashMagicLinkToken(rawToken);

    // 3. Consent hash
    const consentHash = await sha256Hex(EPHEMERAL_CONSENT_TEXT);

    // 4. Expiration
    const expiresAt = new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000);

    // 5. Insert
    const { data: ea, error } = await withRetry(() =>
      supabaseAdmin
        .from("ephemeral_activities")
        .insert({
          workspace_id: data.workspaceId,
          patient_id: data.patientId,
          activity_id: data.activityId,
          assigned_by: userId,
          delivery_mode: data.deliveryMode,
          token_hash: tokenHash,
          token_expires_at: expiresAt.toISOString(),
          therapist_consent_at: new Date().toISOString(),
          therapist_consent_text_hash: consentHash,
        })
        .select("id")
        .single(),
    );

    if (error) throw new Error("Falha ao criar atividade efêmera.");

    return {
      ephemeralActivityId: ea.id,
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    };
  });

// ----------------------------------------------------------------
// listEphemeralActivities
// ----------------------------------------------------------------

const ListEphemeralSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const listEphemeralActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListEphemeralSchema.parse(input))
  .handler(async ({ data }) => {
    const activities = await listEphemeralActivitiesForPatient(
      data.patientId,
      data.workspaceId,
    );

    // Enrich with activity titles
    const activityIds = [...new Set(activities.map((a) => a.activity_id))];
    const { data: catalog } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, title, slug, archetype")
      .in("id", activityIds);

    const catalogMap = new Map(
      (catalog ?? []).map((c) => [c.id, c]),
    );

    return {
      activities: activities.map((a) => ({
        ...a,
        activity: catalogMap.get(a.activity_id) ?? null,
      })),
    };
  });

// ----------------------------------------------------------------
// revokeEphemeralActivity
// ----------------------------------------------------------------

const RevokeEphemeralSchema = z.object({
  ephemeralActivityId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
});

export const revokeEphemeralActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RevokeEphemeralSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await withRetry(() =>
      supabaseAdmin
        .from("ephemeral_activities")
        .update({
          status: "revoked",
          revocation_reason: data.reason ?? "Revogado pelo terapeuta.",
        })
        .eq("id", data.ephemeralActivityId)
        .eq("workspace_id", data.workspaceId)
        .in("status", ["pending", "opened"]),
    );

    if (error) throw new Error("Falha ao revogar atividade efêmera.");
    return { success: true };
  });

// ----------------------------------------------------------------
// recordEphemeralPdfDownload
// ----------------------------------------------------------------

const PdfDownloadSchema = z.object({
  ephemeralActivityId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const recordEphemeralPdfDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PdfDownloadSchema.parse(input))
  .handler(async ({ data }) => {
    // Increment download count — triggers audit via DB trigger
    const { error } = await withRetry(() =>
      supabaseAdmin.rpc("increment_ephemeral_pdf_download", {
        _ephemeral_activity_id: data.ephemeralActivityId,
      }),
    );

    // Fallback if RPC doesn't exist yet — direct update
    if (error) {
      await supabaseAdmin
        .from("ephemeral_activities")
        .update({
          pdf_download_count: 1, // will be overridden by trigger
          pdf_downloaded_at: new Date().toISOString(),
        })
        .eq("id", data.ephemeralActivityId)
        .eq("workspace_id", data.workspaceId);
    }

    return { success: true };
  });

// ----------------------------------------------------------------
// recordEphemeralWarningShown
// ----------------------------------------------------------------

const WarningShownSchema = z.object({
  ephemeralActivityId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const recordEphemeralWarningShown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WarningShownSchema.parse(input))
  .handler(async ({ data, context }) => {
    await recordAudit({
      actorId: context.userId,
      workspaceId: data.workspaceId,
      action: "ephemeral.expiration_warning_shown",
      resourceType: "ephemeral_activity",
      resourceId: data.ephemeralActivityId,
      metadata: {},
    });
    return { success: true };
  });
