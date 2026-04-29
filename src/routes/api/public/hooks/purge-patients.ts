/**
 * /api/public/hooks/purge-patients (rev 2 — secret check ativado)
 *
 * Endpoint de fallback do purge automático de PHI.
 * O agendador real é o pg_cron (`purge-expired-patients-daily`, 03:15 UTC).
 * Este endpoint existe pra:
 *   - permitir disparar manualmente (em casos de manutenção / migração)
 *   - servir de redundância caso o pg_cron seja pausado pelo Supabase
 *
 * Segurança:
 *   - Requer header `x-purge-secret` igual ao secret PURGE_HOOK_SECRET.
 *   - Se o secret não estiver configurado, o endpoint é inerte (devolve 503).
 *   - Usa supabaseAdmin (service role) pra chamar a função SECURITY DEFINER
 *     `public.purge_expired_patients()`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logServerError } from "@/lib/logger.server";

export const Route = createFileRoute("/api/public/hooks/purge-patients")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PURGE_HOOK_SECRET;
        if (!secret) {
          return new Response(
            JSON.stringify({ error: "purge hook not configured" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const provided = request.headers.get("x-purge-secret");
        if (!provided || provided !== secret) {
          return new Response(
            JSON.stringify({ error: "unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data, error } = await supabaseAdmin.rpc(
          "purge_expired_patients",
        );

        if (error) {
          logServerError("purgePatients.rpc", error);
          return new Response(
            JSON.stringify({ ok: false, error: "purge failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const row = Array.isArray(data) ? data[0] : data;
        return new Response(
          JSON.stringify({
            ok: true,
            purged_count: row?.purged_count ?? 0,
            run_at: row?.run_at ?? new Date().toISOString(),
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
