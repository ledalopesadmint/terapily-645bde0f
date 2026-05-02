/**
 * /admin/audit — Audit log viewer (admin only).
 */

import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, Search } from "lucide-react";
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

function AdminAuditTab() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(50);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("id, action, resource_type, resource_id, workspace_id, actor_id, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filter) {
        query = query.ilike("action", `%${filter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as AuditEntry[]) ?? []);
    } catch (err) {
      console.error("[audit] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow>Audit Log</Eyebrow>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro imutável de todas as ações da plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filtrar por ação..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <ScrollText className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full text-left">
            <thead className="bg-muted/40">
              <tr>
                <Th>Quando</Th>
                <Th>Ação</Th>
                <Th>Recurso</Th>
                <Th>ID</Th>
                <Th>Metadata</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border/50 hover:bg-muted/30">
                  <Td className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </Td>
                  <Td>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{log.action}</code>
                  </Td>
                  <Td className="text-muted-foreground">{log.resource_type ?? "—"}</Td>
                  <Td>
                    <code className="font-mono text-xs text-muted-foreground">
                      {log.resource_id ? log.resource_id.slice(0, 8) : "—"}
                    </code>
                  </Td>
                  <Td>
                    <code className="block max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                      {Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : "—"}
                    </code>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
