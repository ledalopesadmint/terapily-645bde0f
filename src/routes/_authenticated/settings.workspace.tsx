import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workspaceUpdateSchema } from "@/lib/validation/schemas";
import { renameWorkspace } from "@/features/workspace/workspace.functions";
import { logClientError } from "@/lib/logger";

export const Route = createFileRoute("/_authenticated/settings/workspace")({
  head: () => ({
    meta: [{ title: "Espaço de trabalho · Ajustes · Terapily" }],
  }),
  component: WorkspaceSettingsPage,
});

function roleLabel(role: string): string {
  if (role === "owner") return "Proprietária";
  if (role === "therapist") return "Terapeuta";
  if (role === "supervisor") return "Supervisora";
  return role;
}

function WorkspaceSettingsPage() {
  const { workspace, refresh } = useAuth();
  const renameWorkspaceFn = useServerFn(renameWorkspace);

  const [name, setName] = useState(workspace?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = workspace?.role === "owner";

  // Lista membros (RLS: só membros do mesmo workspace conseguem ler).
  // Sem FK declarada entre workspace_members e profiles, fazemos 2 queries
  // separadas (RLS de profiles permite admin ou self — em workspaces com
  // múltiplos membros, ajustaremos a policy em M3+ junto com convites).
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["workspace-members", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data: mems, error: err } = await supabase
        .from("workspace_members")
        .select("user_id, role, created_at")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (err) {
        logClientError("workspaceMembers.fetch", err);
        return [];
      }
      const ids = (mems ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));

      return (mems ?? []).map((m) => ({
        ...m,
        full_name: profMap.get(m.user_id) ?? null,
      }));
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!workspace?.id) return;

    const parsed = workspaceUpdateSchema.safeParse({ name: name.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nome inválido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await renameWorkspaceFn({
        data: { workspace_id: workspace.id, name: parsed.data.name },
      });
      await refresh();
      toast.success("Salvo.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Algo não funcionou.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-12">
      {/* Renomear workspace */}
      <div>
        <Eyebrow>Espaço de trabalho</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-foreground">
          O nome que aparece pra você e seus colegas.
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="workspace_name">Nome</Label>
            <Input
              id="workspace_name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              required
              disabled={!isOwner || isSubmitting}
              aria-invalid={!!error}
            />
            {!isOwner && (
              <p className="text-xs text-muted-foreground">
                Apenas a proprietária pode renomear este espaço.
              </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {isOwner && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || name.trim() === workspace?.name}
                className="min-w-[140px]"
              >
                {isSubmitting ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Membros (read-only na S1) */}
      <div>
        <Eyebrow tone="muted">Membros</Eyebrow>
        <h3 className="mt-2 font-display text-xl text-foreground">
          Quem tem acesso a este espaço.
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Convidar colegas chega na Semana 3 do roadmap.
        </p>

        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          {isLoadingMembers ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Carregando…
            </p>
          ) : !members || members.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nenhum membro encontrado.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {members.map((m) => {
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.full_name ?? "Sem nome"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entrou em{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(m.created_at))}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground">
                      {roleLabel(m.role)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
