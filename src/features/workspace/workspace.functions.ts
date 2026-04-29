/**
 * Server functions de workspace — Sexta da S1.
 *
 * Padrão: Zod → requireSupabaseAuth → RLS → withAudit.
 *
 * Permissões garantidas pelo banco (Terça da S1):
 *   - workspaces.update: só `owner` (policy `workspaces: owner update`)
 *   - workspace_members.select: só membros do mesmo workspace
 *
 * Não existe (e não deve existir) função pra alterar role de membro,
 * convidar membro ou mudar plan/status — isso fica pra M3+ (convites)
 * e S2 (billing real).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logServerError } from "@/lib/logger.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withAudit } from "@/features/audit/audit.server";
import { workspaceUpdateSchema } from "@/lib/validation/schemas";

const renameWorkspaceInput = workspaceUpdateSchema.extend({
  workspace_id: z.string().uuid(),
});

export const renameWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => renameWorkspaceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    return withAudit(
      {
        actorId: userId,
        workspaceId: data.workspace_id,
        action: "workspace.renamed",
        resourceType: "workspace",
        resourceId: data.workspace_id,
        // PII-safe: NÃO inclui o nome novo (pode conter dados pessoais).
        // Só registra que o nome mudou.
        metadata: { fields: ["name"] },
      },
      async () => {
        // RLS (`workspaces: owner update`) bloqueia se não for owner.
        const { data: updated, error } = await supabase
          .from("workspaces")
          .update({ name: data.name })
          .eq("id", data.workspace_id)
          .is("deleted_at", null)
          .select("id, name, slug, trial_ends_at")
          .single();

        if (error) {
          logServerError("renameWorkspace", error);
          throw new Error(
            "Não foi possível renomear o espaço de trabalho. Você precisa ser proprietária.",
          );
        }

        return { workspace: updated };
      },
    );
  });
