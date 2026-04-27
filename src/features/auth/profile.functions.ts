/**
 * Server functions de perfil — Quinta da S1.
 *
 * Padrão future-proof:
 *   Zod (mesmo schema do client) → requireSupabaseAuth → RLS → audit log inline.
 *
 * Helper `withAudit()` chega na Sexta da S1 e vai envolver isto sem mudar a API.
 * Por enquanto o audit é inserido inline com `supabaseAdmin` (única forma de
 * escrever em `audit_logs`, que tem INSERT REVOKED para authenticated/anon).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { profileUpdateSchema } from "@/lib/validation/schemas";

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Mutação real — RLS garante que o usuário só edita o próprio perfil.
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        country: data.country ?? null,
        license_number: data.license_number ?? null,
        npi: data.npi ?? null,
        locale: data.locale,
        timezone: data.timezone,
      })
      .eq("id", userId)
      .select("id, full_name, avatar_url, locale, timezone")
      .single();

    if (error) {
      console.error("updateProfile failed:", error);
      throw new Error("Não foi possível salvar seu perfil.");
    }

    // 2. Audit log — via service role (única forma permitida pela hardening da Terça).
    //    Falha no audit NÃO derruba a mutação, mas é logada pra observabilidade.
    try {
      const userAgent = getRequestHeader("user-agent") ?? null;
      const forwarded = getRequestHeader("x-forwarded-for") ?? null;
      const ip = forwarded?.split(",")[0]?.trim() || null;

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: userId,
        action: "profile.updated",
        resource_type: "profile",
        resource_id: userId,
        metadata: {
          fields: Object.keys(data),
        },
        ip,
        user_agent: userAgent,
      });
    } catch (auditError) {
      console.error("Audit log failed (non-blocking):", auditError);
    }

    return { profile: updated };
  });
