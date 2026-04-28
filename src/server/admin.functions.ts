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
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
