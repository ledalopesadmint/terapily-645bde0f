/**
 * Server functions de perfil — Quinta da S1, refatorado na Sexta.
 *
 * Padrão future-proof:
 *   Zod (mesmo schema do client) → requireSupabaseAuth → RLS → withAudit().
 *
 * `withAudit` (Sexta) substitui o audit inline da Quinta. API igual,
 * agora reutilizável por todas as server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withAudit } from "@/features/audit/audit.server";
import { logServerError } from "@/lib/logger.server";
import { profileUpdateSchema } from "@/lib/validation/schemas";

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    return withAudit(
      {
        actorId: userId,
        action: "profile.updated",
        resourceType: "profile",
        resourceId: userId,
        // PII-safe: só enumera os nomes dos campos alterados, sem valores.
        metadata: { fields: Object.keys(data) },
      },
      async () => {
        // RLS garante que o usuário só edita o próprio perfil.
        // Update por campo explícito — nunca espalhar `...data`.
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
          logServerError("updateProfile", error);
          throw new Error("Não foi possível salvar seu perfil.");
        }

        return { profile: updated };
      },
    );
  });
