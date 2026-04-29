/**
 * Server functions do painel /admin.
 *
 * Tudo aqui exige role 'admin'. Usamos requireSupabaseAuth + cheque manual de
 * has_role(admin) — mesmo que RLS já bloqueie, retornamos 403 explícito
 * pra dar feedback claro ao client e evitar 500 silencioso.
 *
 * S1: somente leitura. CRUD entra em S3 quando o schema do `config` JSONB
 * por arquétipo estiver travado no Player.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AdminCatalogStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  byArchetype: Record<string, number>;
}

export interface AdminCatalogRow {
  id: string;
  slug: string;
  title: string;
  archetype: string;
  theme: string;
  status: string;
  category: string;
  is_featured: boolean;
  updated_at: string;
}

export interface AdminCatalogPayload {
  stats: AdminCatalogStats;
  items: AdminCatalogRow[];
}

export const getAdminCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCatalogPayload> => {
    const { supabase, userId } = context;

    // Defesa em profundidade: confirma role admin via RPC (RLS já filtra,
    // mas devolvemos 403 limpo se algum dia alguém perder a policy).
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) {
      throw new Error("Acesso negado: apenas o admin pode ver o catálogo.");
    }

    const { data, error } = await supabase
      .from("activity_catalog")
      .select(
        "id, slug, title, archetype, theme, status, category, is_featured, updated_at",
      )
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const items = (data ?? []) as AdminCatalogRow[];

    const stats: AdminCatalogStats = {
      total: items.length,
      published: items.filter((i) => i.status === "published").length,
      draft: items.filter((i) => i.status === "draft").length,
      archived: items.filter((i) => i.status === "archived").length,
      byArchetype: items.reduce<Record<string, number>>((acc, i) => {
        acc[i.archetype] = (acc[i.archetype] ?? 0) + 1;
        return acc;
      }, {}),
    };

    return { stats, items };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Featured activity (curadoria semanal do hero do /library)
// ─────────────────────────────────────────────────────────────────────────────

export interface FeaturedActivity {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  archetype: string;
  theme: string;
  category: string;
  status: string;
  config: { [x: string]: {} };
}

/**
 * setFeaturedActivity — admin marca UMA atividade como destaque do acervo.
 *
 * Regras:
 * - Apenas admin (cheque via has_role + RLS de activity_catalog).
 * - Atomicidade lógica: limpa todos os flags antes de ligar o novo.
 *   Se vier `id=null`, apenas desliga todos (sem destaque).
 * - Permite destacar atividades em status='draft' (preview interno do admin).
 *   O hero faz fallback se a destacada não estiver visível ao terapeuta.
 */
export const setFeaturedActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Apenas o admin pode definir o destaque.");

    // 1. Limpa qualquer destaque anterior (service role pra garantir
    //    que a transição passe mesmo com policies futuras mais estritas).
    const { error: clearErr } = await supabaseAdmin
      .from("activity_catalog")
      .update({ is_featured: false })
      .eq("is_featured", true);
    if (clearErr) {
      console.error("[setFeaturedActivity] clear failed", { code: clearErr.code });
      throw new Error("Falha ao atualizar o destaque.");
    }

    // 2. Liga o novo (se houver).
    if (data.id) {
      const { error: setErr, data: updated } = await supabaseAdmin
        .from("activity_catalog")
        .update({ is_featured: true })
        .eq("id", data.id)
        .select("id, slug, title")
        .single();
      if (setErr || !updated) {
        console.error("[setFeaturedActivity] set failed", { code: setErr?.code });
        throw new Error("Atividade não encontrada.");
      }

      // 3. Registra no histórico (best-effort: falha não bloqueia o destaque).
      //    Permite responder "nunca foi destaque" no painel de insights.
      const { error: histErr } = await supabaseAdmin
        .from("featured_activity_history")
        .insert({ activity_id: updated.id, set_by: userId });
      if (histErr) {
        console.error("[setFeaturedActivity] history insert failed", {
          code: histErr.code,
        });
      }

      return { id: updated.id, slug: updated.slug, title: updated.title };
    }

    return { id: null, slug: null, title: null };
  });

/**
 * getFeaturedActivity — qualquer terapeuta autenticado lê a atividade em destaque.
 *
 * Retorna `null` se:
 *  - nada está marcado, OU
 *  - a atividade marcada está em draft/archived e o workspace do terapeuta
 *    não tem a flag `library_selection_preview` ligada.
 *
 * Não vaza PHI nem expõe drafts pra quem não pode ver.
 */
const FeaturedSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

export const getFeaturedActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeaturedSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<FeaturedActivity | null> => {
    const { supabase } = context;

    let includeDrafts = false;
    if (data.workspaceId) {
      const { data: flagOn } = await supabase.rpc("has_feature", {
        _workspace_id: data.workspaceId,
        _flag: "library_selection_preview",
      });
      includeDrafts = Boolean(flagOn);
    }

    // RLS de activity_catalog já filtra: terapeuta só vê published; admin vê tudo.
    // Aqui apenas adicionamos o gating extra de drafts via feature flag pra
    // espelhar a regra do listAvailableActivities.
    const { data: row, error } = await supabase
      .from("activity_catalog")
      .select(
        "id, slug, title, short_description, archetype, theme, category, status, config",
      )
      .eq("is_featured", true)
      .maybeSingle();

    if (error) {
      console.error("[getFeaturedActivity] query failed", { code: error.code });
      return null;
    }
    if (!row) return null;

    if (row.status !== "published" && !includeDrafts) {
      return null;
    }
    return row as FeaturedActivity;
  });
