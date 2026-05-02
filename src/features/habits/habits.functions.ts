/**
 * Server functions for habit tracker links.
 *
 * Habit links are REUSABLE tokens for mindfulness/habit activities.
 * Unlike magic links (single-use), habit links allow multiple executions
 * and track a history of entries (date, duration, cycles).
 *
 * Rules:
 *  - One active habit link per patient+activity+workspace.
 *  - Token hashed with SHA-256 (same pattern as magic links).
 *  - Longer expiration (30d default, configurable by tier).
 *  - Entries are immutable — recorded via server function only.
 *  - metadata_encrypted uses AES-256 (same PHI_ENCRYPTION_KEY).
 *  - Category gating: currently only `mindfulness` activities use habit links.
 *    The `HABIT_LINK_CATEGORIES` set controls which categories are eligible.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";
import { generateMagicLinkToken, hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import {
  getActivePatientForWorkspace,
  getActivityFromCatalog,
} from "@/features/activities/activities.server";
import {
  getActiveHabitLink,
  getHabitLinkByTokenHash,
  insertHabitEntry,
  getHabitEntries,
} from "./habits.server";
import { encryptPHIServer } from "@/lib/crypto/encryption.server";

// ----------------------------------------------------------------
// Category gating — expand this set to enable habit links for more categories
// ----------------------------------------------------------------
export const HABIT_LINK_CATEGORIES = new Set(["mindfulness"]);

// ----------------------------------------------------------------
// Tier → habit link expiration (in days)
// ----------------------------------------------------------------
const TIER_HABIT_LINK_DAYS: Record<string, number> = {
  trial: 7,
  solo: 7,
  basic: 30,
  practice: 90,
  clinic: 90,
};

async function getWorkspaceTier(workspaceId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("tier")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data?.tier ?? "trial";
}

// --- createHabitLink -------------------------------------------------------

const CreateHabitLinkSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  activityId: z.string().uuid(),
});

export const createHabitLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateHabitLinkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 1. Patient alive in workspace
    const patient = await getActivePatientForWorkspace(data.patientId, data.workspaceId);
    if (!patient) throw new Error("Paciente não encontrado neste workspace.");

    // 2. Activity exists and is published
    const activity = await getActivityFromCatalog(data.activityId);
    if (!activity) throw new Error("Atividade indisponível.");
    if (activity.status !== "published") throw new Error("Atividade indisponível.");

    // 3. Category check — only eligible categories
    const activityCategory = (activity.config as Record<string, unknown>)?.category as string | undefined;
    // Fallback: check seed-data category mapping via slug pattern
    // For now we check the catalog's category field
    const { data: catalogRow } = await supabaseAdmin
      .from("activity_catalog")
      .select("category")
      .eq("id", data.activityId)
      .maybeSingle();
    const category = catalogRow?.category ?? activityCategory;
    if (!category || !HABIT_LINK_CATEGORIES.has(category)) {
      throw new Error("Esta atividade não suporta links de hábito.");
    }

    // 4. Membership + permission
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
      throw new Error("Sem permissão pra criar link de hábito pra este paciente.");
    }

    // 5. Check for existing active link (one per patient+activity+workspace)
    const existing = await getActiveHabitLink(data.workspaceId, data.patientId, data.activityId);
    if (existing) {
      // Return existing link info (token can't be recovered — need to revoke+recreate)
      return {
        id: existing.id,
        alreadyExists: true,
        rawToken: null as string | null,
        expiresAt: existing.expires_at,
        totalEntries: existing.total_entries,
      };
    }

    // 6. Generate token
    const tier = await getWorkspaceTier(data.workspaceId);
    const expirationDays = TIER_HABIT_LINK_DAYS[tier] ?? 7;
    const rawToken = generateMagicLinkToken(activity.slug);
    const tokenHash = await hashMagicLinkToken(rawToken);
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();

    // 7. Insert
    const { data: created, error } = await withRetry(() =>
      supabaseAdmin
        .from("habit_links")
        .insert({
          workspace_id: data.workspaceId,
          patient_id: data.patientId,
          activity_id: data.activityId,
          assigned_by: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          status: "active",
        })
        .select("id, expires_at")
        .single(),
    );

    if (error || !created) {
      console.error("[createHabitLink] insert failed", { code: error?.code });
      throw new Error("Não foi possível criar o link de hábito.");
    }

    return {
      id: created.id,
      alreadyExists: false,
      rawToken: rawToken as string | null,
      expiresAt: created.expires_at,
      totalEntries: 0,
    };
  });

// --- revokeHabitLink -------------------------------------------------------

const RevokeHabitLinkSchema = z.object({
  habitLinkId: z.string().uuid(),
  reason: z.string().trim().max(200).optional(),
});

export const revokeHabitLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RevokeHabitLinkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: link, error: linkErr } = await supabaseAdmin
      .from("habit_links")
      .select("id, workspace_id, assigned_by, status")
      .eq("id", data.habitLinkId)
      .maybeSingle();

    if (linkErr || !link) throw new Error("Link não encontrado.");

    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", link.workspace_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    const isOwner = membership?.role === "owner";
    if (!isOwner && link.assigned_by !== userId) {
      throw new Error("Sem permissão pra revogar este link.");
    }

    if (link.status === "revoked") {
      return { id: link.id, alreadyRevoked: true };
    }

    const { error: updErr } = await supabaseAdmin
      .from("habit_links")
      .update({
        status: "revoked",
        token_hash: `revoked_${link.id}`, // Invalidate but keep unique
        revocation_reason: data.reason || null,
      })
      .eq("id", link.id);

    if (updErr) throw new Error("Não foi possível revogar o link.");

    return { id: link.id, alreadyRevoked: false };
  });

// --- submitHabitEntry (PUBLIC — no auth, called from /h/$token) ------------

const SubmitEntrySchema = z.object({
  tokenHash: z.string().min(1).max(128),
  durationSeconds: z.number().int().min(0).max(7200).optional(),
  cyclesCompleted: z.number().int().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const submitHabitEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitEntrySchema.parse(input))
  .handler(async ({ data }) => {
    // 1. Find the habit link
    const link = await getHabitLinkByTokenHash(data.tokenHash);
    if (!link) throw new Error("Link não encontrado ou expirado.");

    // 2. Check status + expiration
    if (link.status !== "active") throw new Error("Este link foi revogado.");
    if (new Date(link.expires_at) < new Date()) {
      // Auto-expire
      await supabaseAdmin
        .from("habit_links")
        .update({ status: "expired" })
        .eq("id", link.id);
      throw new Error("Este link expirou.");
    }

    // 3. Encrypt metadata if present
    let metadataEncrypted: string | undefined;
    if (data.metadata && Object.keys(data.metadata).length > 0) {
      metadataEncrypted = await encryptPHIServer(JSON.stringify(data.metadata));
    }

    // 4. Insert entry (trigger updates counters on habit_links)
    const entry = await insertHabitEntry({
      habit_link_id: link.id,
      workspace_id: link.workspace_id,
      patient_id: link.patient_id,
      activity_id: link.activity_id,
      duration_seconds: data.durationSeconds,
      cycles_completed: data.cyclesCompleted,
      metadata_encrypted: metadataEncrypted,
    });

    return {
      entryId: entry.id,
      completedAt: entry.completed_at,
      totalEntries: (link.total_entries ?? 0) + 1,
    };
  });

// --- getHabitHistory (PUBLIC — returns non-PHI aggregate data) -------------

const HistorySchema = z.object({
  tokenHash: z.string().min(1).max(128),
});

export const getHabitHistory = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => HistorySchema.parse(input))
  .handler(async ({ data }) => {
    const link = await getHabitLinkByTokenHash(data.tokenHash);
    if (!link) throw new Error("Link não encontrado.");

    if (link.status !== "active" && link.status !== "expired") {
      throw new Error("Este link foi revogado.");
    }

    const entries = await getHabitEntries(link.id, 200);

    return {
      activityId: link.activity_id,
      totalEntries: link.total_entries ?? entries.length,
      lastEntryAt: link.last_entry_at,
      entries: entries.map((e) => ({
        id: e.id,
        completedAt: e.completed_at,
        durationSeconds: e.duration_seconds,
        cyclesCompleted: e.cycles_completed,
      })),
    };
  });

// --- listPatientHabitLinks (therapist view) --------------------------------

const ListHabitLinksSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const listPatientHabitLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListHabitLinksSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // No FK between habit_links and activity_catalog, so query separately
    const { data: rawLinks, error } = await supabase
      .from("habit_links")
      .select("id, status, expires_at, total_entries, last_entry_at, created_at, activity_id")
      .eq("patient_id", data.patientId)
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listPatientHabitLinks] failed", { code: error.code });
      throw new Error("Não foi possível carregar links de hábito.");
    }

    if (!rawLinks || rawLinks.length === 0) {
      return { links: [] };
    }

    // Fetch activity info for all unique activity_ids
    const activityIds = [...new Set(rawLinks.map((l) => l.activity_id))];
    const { data: activities } = await supabase
      .from("activity_catalog")
      .select("id, slug, title, archetype")
      .in("id", activityIds);

    const activityMap = new Map(
      (activities ?? []).map((a) => [a.id, a]),
    );

    const links = rawLinks.map((l) => ({
      id: l.id,
      status: l.status,
      expires_at: l.expires_at,
      total_entries: l.total_entries,
      last_entry_at: l.last_entry_at,
      created_at: l.created_at,
      activity: activityMap.get(l.activity_id) ?? null,
    }));

    return { links };
  });

// --- getHabitEntriesForLink (therapist view) --------------------------------

const GetHabitEntriesSchema = z.object({
  habitLinkId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const getHabitEntriesForLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetHabitEntriesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: entries, error } = await supabase
      .from("habit_entries")
      .select("id, completed_at, duration_seconds, cycles_completed, created_at")
      .eq("habit_link_id", data.habitLinkId)
      .eq("workspace_id", data.workspaceId)
      .order("completed_at", { ascending: false })
      .limit(data.limit ?? 200);

    if (error) {
      console.error("[getHabitEntriesForLink] failed", { code: error.code });
      throw new Error("Não foi possível carregar entradas.");
    }

    return { entries: entries ?? [] };
  });
