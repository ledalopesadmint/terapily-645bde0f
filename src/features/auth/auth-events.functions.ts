/**
 * Auth events — registra signin/signout em audit_logs.
 *
 * Por que server function (e não trigger em auth.users)?
 *   - auth.* é schema reservado do Supabase. Triggers ali são frágeis em
 *     upgrades e podem quebrar o login todo se falharem.
 *   - Server function chamada do AuthProvider depois do evento já confirmado
 *     pelo onAuthStateChange é mais robusto e fácil de manter.
 *
 * IP + user-agent são capturados automaticamente em audit.server.ts via
 * captureRequestContext().
 *
 * Metadata 100% PII-safe — só `user_id`. Nunca email, nunca display_name.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/features/audit/audit.server";

const authEventSchema = z.object({
  action: z.enum(["auth.signin", "auth.signout"]),
});

export const recordAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => authEventSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await recordAudit({
      actorId: userId,
      workspaceId: null,
      action: data.action,
      resourceType: "user",
      resourceId: userId,
      metadata: { user_id: userId },
    });
    return { ok: true };
  });
