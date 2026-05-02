/**
 * /admin/audit — Audit log viewer with filters, pagination, event details.
 */

import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAuditTab,
});

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  workspace_id: string | null;
  actor_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

const PAGE_SIZE = 50;

function AdminAuditTab() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("id, action, resource_type, resource_id, workspace_id, actor_id, created_at, metadata", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter) {
        query = query.ilike("action", `%${actionFilter}%`);
      }
      if (actorFilter) {
        query = query.eq("actor_id", actorFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setLogs((data as AuditEntry[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error("[audit] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, actorFilter, page]);

  useEffect(() => { void load(); }, [load]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [actionFilter, actorFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow>Audit Log</Eyebrow>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro imutável de todas as ações da plataforma.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar por ação..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative min-w-[180px] max-w-[300px]">
          <input
            type="text"
            placeholder="Filtrar por actor UUID..."
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono placeholder:text-muted-foreground placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {totalCount} registro{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <ScrollText className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-left">
              <thead className="bg-muted/40">
                <tr>
                  <Th>Quando</Th>
                  <Th>Ação</Th>
                  <Th>Recurso</Th>
                  <Th>Actor</Th>
                  <Th>Workspace</Th>
                  <Th>Detalhes</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const hasMetadata = Object.keys(log.metadata).length > 0;
                  return (
                    <>
                      <tr key={log.id} className="border-t border-border/50 hover:bg-muted/30">
                        <Td className="text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })}
                        </Td>
                        <Td>
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{log.action}</code>
                        </Td>
                        <Td className="text-muted-foreground">
                          {log.resource_type ?? "—"}
                          {log.resource_id && (
                            <code className="ml-1 font-mono text-xs">{log.resource_id.slice(0, 8)}</code>
                          )}
                        </Td>
                        <Td>
                          <code className="font-mono text-xs text-muted-foreground">
                            {log.actor_id ? log.actor_id.slice(0, 8) + "…" : "system"}
                          </code>
                        </Td>
                        <Td>
                          <code className="font-mono text-xs text-muted-foreground">
                            {log.workspace_id ? log.workspace_id.slice(0, 8) + "…" : "—"}
                          </code>
                        </Td>
                        <Td>
                          {hasMetadata ? (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? "Fechar" : "Ver"}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </Td>
                      </tr>
                      {isExpanded && hasMetadata && (
                        <tr key={`${log.id}-detail`} className="border-t border-border/30 bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="max-h-[200px] overflow-auto rounded bg-muted p-3 font-mono text-xs text-foreground">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}
