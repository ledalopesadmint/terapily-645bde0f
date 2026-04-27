/**
 * Hook de feature flags por workspace.
 *
 * Consome a função SQL `has_feature(workspace_id, flag_name)` SECURITY DEFINER
 * (criada na Terça da S1, junto com a tabela `feature_flags`).
 *
 * S1: nenhuma flag está habilitada por padrão — sempre retorna `false`. Mas
 *     a interface está pronta pra uso imediato em qualquer feature futura,
 *     sem refator. Basta inserir uma linha em `feature_flags` para uma flag
 *     ficar `true` no workspace.
 *
 * Uso:
 *   const { data: hasGames } = useFeatureFlag("games_v1", workspace?.id);
 *   if (hasGames) { ... }
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureFlag(
  flagName: string,
  workspaceId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["feature-flag", workspaceId, flagName],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return false;
      const { data, error } = await supabase.rpc("has_feature", {
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
