/**
 * /admin — Aba "Acervo": stats do catálogo + atividades agrupadas por arquétipo.
 */

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles, FileText, Archive, ShieldCheck, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import {
  getAdminCatalog,
  setFeaturedActivity,
  type AdminCatalogPayload,
} from "@/server/admin.functions";
import { ARCHETYPE_LIST } from "@/features/library/archetypes";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminAcervoTab,
});

function AdminAcervoTab() {
  const { hasRole } = useAuth();
  const [data, setData] = useState<AdminCatalogPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuringId, setFeaturingId] = useState<string | null>(null);
  const [expandedArchetype, setExpandedArchetype] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    return getAdminCatalog()
      .then((res) => { setData(res); setLoadError(null); })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!hasRole("admin")) return;
    let cancelled = false;
    setLoading(true);
    getAdminCatalog()
      .then((res) => { if (!cancelled) { setData(res); setLoadError(null); } })
      .catch((err: Error) => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hasRole]);

  const handleToggleFeatured = async (id: string, currentlyFeatured: boolean) => {
    setFeaturingId(id);
    try {
      const targetId = currentlyFeatured ? null : id;
      const res = await setFeaturedActivity({ data: { id: targetId } });
      if (res.id) {
        toast.success("Destaque atualizado", { description: `${res.title} agora aparece no topo do acervo.` });
      } else {
        toast.success("Destaque removido", { description: "O acervo vai exibir o fallback editorial." });
      }
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar destaque.");
    } finally {
      setFeaturingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <Eyebrow>Catálogo de atividades</Eyebrow>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reload} disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </button>
          <button type="button"
            onClick={() => toast.info("Disponível em breve", { description: "O criador de atividades chega em breve." })}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Adicionar atividade
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading && <p className="eyebrow text-muted-foreground">Carregando catálogo</p>}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
          <p className="eyebrow !text-destructive">Não consegui carregar</p>
          <p className="mt-1 text-sm text-foreground">{loadError}</p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={Sparkles} label="Publicadas" value={data.stats.published} accent="sage" />
            <StatCard icon={FileText} label="Rascunhos" value={data.stats.draft} accent="mauve" />
            <StatCard icon={Archive} label="Arquivadas" value={data.stats.archived} accent="cream" />
            <StatCard icon={ShieldCheck} label="Total" value={data.stats.total} accent="navy" />
          </div>

          {/* Distribution by archetype — clickable cards */}
          <section>
            <Eyebrow>Por arquétipo</Eyebrow>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {ARCHETYPE_LIST.map((arch) => {
                const count = data.stats.byArchetype[arch.id] ?? 0;
                const isExpanded = expandedArchetype === arch.id;
                return (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => setExpandedArchetype(isExpanded ? null : arch.id)}
                    className={`rounded-md border px-4 py-3 text-left transition-colors ${
                      isExpanded
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/50 bg-card hover:border-primary/30"
                    }`}
                  >
                    <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                      {arch.shortLabel}
                    </p>
                    <p className="mt-1 font-display text-2xl text-foreground">{count}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Activities table — filtered by archetype if selected */}
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <Eyebrow>
                {expandedArchetype
                  ? `Atividades — ${ARCHETYPE_LIST.find((a) => a.id === expandedArchetype)?.shortLabel ?? expandedArchetype}`
                  : "Todas as atividades"}
              </Eyebrow>
              {expandedArchetype && (
                <button
                  type="button"
                  onClick={() => setExpandedArchetype(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Mostrar todas
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {filteredItems(data, expandedArchetype).length} item{filteredItems(data, expandedArchetype).length !== 1 ? "s" : ""}
              </span>
            </div>

            {filteredItems(data, expandedArchetype).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/60 px-6 py-14 text-center">
                <h3 className="font-display text-2xl text-foreground">
                  {expandedArchetype ? "Nenhuma atividade neste arquétipo" : "O acervo ainda está vazio"}
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {expandedArchetype
                    ? "Adicione atividades deste tipo pelo botão acima."
                    : "A tabela está pronta no banco e protegida — só você consegue gravar aqui."}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  Toque na estrela pra trocar a atividade em destaque no acervo.
                </p>
                <div className="overflow-hidden rounded-xl border border-border/50">
                  <table className="w-full text-left">
                    <thead className="bg-muted/40">
                      <tr>
                        <Th>Destaque</Th>
                        <Th>Slug</Th>
                        <Th>Título</Th>
                        <Th>Arquétipo</Th>
                        <Th>Tema</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems(data, expandedArchetype).map((item) => {
                        const busy = featuringId === item.id;
                        return (
                          <tr key={item.id} className="border-t border-border/50 hover:bg-muted/30">
                            <Td>
                              <button type="button"
                                onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                                disabled={busy}
                                aria-pressed={item.is_featured}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50">
                                <Star className={`h-4 w-4 ${item.is_featured ? "fill-secondary text-secondary" : "text-muted-foreground"}`} />
                              </button>
                            </Td>
                            <Td><code className="font-mono text-xs text-muted-foreground">{item.slug}</code></Td>
                            <Td className="font-medium text-foreground">{item.title}</Td>
                            <Td className="text-muted-foreground">{item.archetype}</Td>
                            <Td>
                              <span data-theme={item.theme.replace("_", "-")} className="inline-flex items-center gap-1.5 text-xs">
                                <span aria-hidden className="h-2.5 w-2.5 rounded-full [background-color:var(--activity-accent)]" />
                                {item.theme}
                              </span>
                            </Td>
                            <Td><StatusPill status={item.status} /></Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function filteredItems(data: AdminCatalogPayload, archetype: string | null) {
  if (!archetype) return data.items;
  return data.items.filter((i) => i.archetype === archetype);
}

// ── Subcomponents ──

interface StatCardProps {
  icon: typeof Sparkles;
  label: string;
  value: number;
  accent: "sage" | "mauve" | "navy" | "cream";
}

function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  return (
    <div data-theme={accent}
      className="relative overflow-hidden rounded-xl border border-border/50 bg-card px-5 py-5 transition-shadow hover:[box-shadow:0_12px_30px_-18px_var(--activity-glow)]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] [background-color:var(--activity-accent)] opacity-80" />
      <Icon className="h-4 w-4 [color:var(--activity-accent)]" aria-hidden />
      <p className="mt-3 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: "Publicada", cls: "bg-secondary/15 text-secondary-foreground" },
    draft: { label: "Rascunho", cls: "bg-mauve/20 text-mauve-foreground" },
    archived: { label: "Arquivada", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}
