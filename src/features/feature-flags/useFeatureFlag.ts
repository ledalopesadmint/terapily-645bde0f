/**
 * Hook de feature flags por workspace.
 *
 * Consome a função SQL `has_feature(workspace_id, flag_name)` SECURITY DEFINER
 * (criada na Terça da S1, junto com a tabela `feature_flags`).
 *
 * S1: sempre retorna `false` por default — ainda não há flags ativas, mas
 *     a interface está pronta pra uso imediato em qualquer feature futura.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureFlag(flagName: string, workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["feature-flag", workspaceId, flagName],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return false;
      // Cast necessário enquanto types.ts não inclui a função (gerada na Terça)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("has_feature", {
        _workspace_id: workspaceId,
        _flag: flagName,
      });
      if (error) {
        console.error("Feature flag check failed:", error);
        return false;
      }
      return data === true;
    },
    staleTime: 5 * 60 * 1000,
  });
}
