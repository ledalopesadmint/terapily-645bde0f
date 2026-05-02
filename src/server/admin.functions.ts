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
    const { data: rows, error } = await supabase
      .from("activity_catalog")
      .select(
        "id, slug, title, short_description, archetype, theme, category, status, config",
      )
      .eq("is_featured", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    const row = rows?.[0] ?? null;

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

// ─────────────────────────────────────────────────────────────────────────────
// Catalog Insights — painel de curadoria do admin
// ─────────────────────────────────────────────────────────────────────────────
//
// FUTURE (S5/S6):
// considerar modo automático com:
// - mínimo de uso (ex: 50)
// - fallback manual
// - opt-in no admin
//
// Hoje: apenas leitura agregada pra apoiar a decisão manual de destaque.
// Curadoria editorial continua sendo da Leda — ver docs/catalog-insights.md.

const COMPLETION_MIN_SAMPLE = 10; // mínimo de envios pra entrar no ranking de conclusão
const TOP_LIMIT = 3;
const RECENT_DAYS = 30;

export interface InsightUsageItem {
  activity_id: string;
  title: string;
  slug: string;
  count: number;
}

export interface InsightCompletionItem {
  activity_id: string;
  title: string;
  slug: string;
  total_assigned: number;
  total_completed: number;
  completion_rate: number; // 0..100, arredondado
}

export interface InsightLatestItem {
  activity_id: string;
  title: string;
  slug: string;
  created_at: string;
}

export interface InsightNeverFeaturedItem {
  activity_id: string;
  title: string;
  slug: string;
  status: string;
}

export interface CatalogInsights {
  generated_at: string;
  window_days: number;
  top_used: InsightUsageItem[];
  top_completion: InsightCompletionItem[];
  latest_added: InsightLatestItem | null;
  never_featured: InsightNeverFeaturedItem[];
}

/**
 * getCatalogInsights — painel agregado pro admin.
 *
 * Regras (não negociáveis):
 *  - Apenas admin (cheque has_role).
 *  - supabaseAdmin pra agregar cross-workspace (insights de catálogo, não de
 *    paciente). NUNCA retorna patient_id, workspace_id, conteúdo de resposta
 *    ou qualquer dado clínico — só métricas agregadas por activity_id.
 *  - "Maior conclusão" exige mínimo de COMPLETION_MIN_SAMPLE envios pra evitar
 *    ruído com amostras pequenas.
 *  - Sem cache em banco. Memoização em memória pode entrar depois se virar
 *    gargalo (ver docs/catalog-insights.md).
 */
export const getCatalogInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CatalogInsights> => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Apenas o admin pode ver os insights do catálogo.");

    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Carrega catálogo inteiro uma vez (id → título/slug/status/created_at).
    const { data: catalogRows, error: catalogErr } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, slug, title, status, created_at");
    if (catalogErr) {
      console.error("[getCatalogInsights] catalog fetch failed", {
        code: catalogErr.code,
      });
      throw new Error("Falha ao carregar o catálogo.");
    }
    const catalog = catalogRows ?? [];
    const titleOf = new Map(catalog.map((c) => [c.id, { title: c.title, slug: c.slug }]));

    // ─── 1. Top mais usadas (últimos 30 dias) ────────────────────────────────
    // Agregação client-side: SUM por activity_id de patient_activities criados
    // no período. Sem joins pra patients/workspaces — só metadados.
    const { data: usageRows, error: usageErr } = await supabaseAdmin
      .from("patient_activities")
      .select("activity_id")
      .gte("created_at", since);
    if (usageErr) {
      console.error("[getCatalogInsights] usage fetch failed", { code: usageErr.code });
      throw new Error("Falha ao calcular uso.");
    }

    const usageMap = new Map<string, number>();
    for (const row of usageRows ?? []) {
      const id = row.activity_id as string;
      usageMap.set(id, (usageMap.get(id) ?? 0) + 1);
    }
    const top_used: InsightUsageItem[] = Array.from(usageMap.entries())
      .map(([activity_id, count]) => {
        const meta = titleOf.get(activity_id);
        return meta
          ? { activity_id, title: meta.title, slug: meta.slug, count }
          : null;
      })
      .filter((x): x is InsightUsageItem => x !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_LIMIT);

    // ─── 2. Maior taxa de conclusão (lifetime) ───────────────────────────────
    // Conclusão = used_at preenchido (paciente enviou a resposta).
    // É o sinal mais robusto — vem do submit real, não depende de transição
    // de status no enum patient_activity_status.
    const { data: allAssignments, error: allErr } = await supabaseAdmin
      .from("patient_activities")
      .select("activity_id, used_at");
    if (allErr) {
      console.error("[getCatalogInsights] completion fetch failed", { code: allErr.code });
      throw new Error("Falha ao calcular conclusão.");
    }

    const completionMap = new Map<string, { assigned: number; completed: number }>();
    for (const row of allAssignments ?? []) {
      const id = row.activity_id as string;
      const entry = completionMap.get(id) ?? { assigned: 0, completed: 0 };
      entry.assigned += 1;
      if (row.used_at) {
        entry.completed += 1;
      }
      completionMap.set(id, entry);
    }
    const top_completion: InsightCompletionItem[] = Array.from(completionMap.entries())
      .filter(([, v]) => v.assigned >= COMPLETION_MIN_SAMPLE)
      .map(([activity_id, v]) => {
        const meta = titleOf.get(activity_id);
        if (!meta) return null;
        return {
          activity_id,
          title: meta.title,
          slug: meta.slug,
          total_assigned: v.assigned,
          total_completed: v.completed,
          completion_rate: Math.round((v.completed / v.assigned) * 100),
        };
      })
      .filter((x): x is InsightCompletionItem => x !== null)
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, TOP_LIMIT);

    // ─── 3. Última adicionada ────────────────────────────────────────────────
    const latestRow = [...catalog].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1,
    )[0];
    const latest_added: InsightLatestItem | null = latestRow
      ? {
          activity_id: latestRow.id,
          title: latestRow.title,
          slug: latestRow.slug,
          created_at: latestRow.created_at,
        }
      : null;

    // ─── 4. Nunca foi destaque ───────────────────────────────────────────────
    const { data: history, error: histErr } = await supabaseAdmin
      .from("featured_activity_history")
      .select("activity_id");
    if (histErr) {
      console.error("[getCatalogInsights] history fetch failed", { code: histErr.code });
      throw new Error("Falha ao carregar histórico de destaques.");
    }
    const featuredOnce = new Set((history ?? []).map((h) => h.activity_id as string));
    const never_featured: InsightNeverFeaturedItem[] = catalog
      .filter((c) => !featuredOnce.has(c.id))
      .slice(0, TOP_LIMIT)
      .map((c) => ({
        activity_id: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
      }));

    return {
      generated_at: new Date().toISOString(),
      window_days: RECENT_DAYS,
      top_used,
      top_completion,
      latest_added,
      never_featured,
    };
  });
