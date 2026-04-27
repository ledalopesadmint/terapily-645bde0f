/**
 * Hook de feature flags por workspace.
 *
 * Consome a função SQL `has_feature(workspace_id, flag_name)` SECURITY DEFINER.
 * Permite ativar features gradualmente (beta testers, rollout por workspace).
 *
 * S1: tabela `feature_flags` existe, função `has_feature` existe.
 *     Sempre retorna `false` (nenhuma flag ativa por default).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureFlag(flagName: string, workspaceId: string | null | undefined) {
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
    staleTime: 5 * 60 * 1000, // 5min
  });
}
