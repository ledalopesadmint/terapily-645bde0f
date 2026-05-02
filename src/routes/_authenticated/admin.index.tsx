/**
 * /admin — Aba "Acervo": stats do catálogo + atividades agrupadas por arquétipo.
 *
 * Inclui busca, ordenação, filtros por tipo e paginação.
 */

import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Sparkles,
  FileText,
  Archive,
  ShieldCheck,
  RefreshCw,
  Star,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
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

type SortField = "slug" | "title" | "status" | "archetype";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "published", label: "Publicadas" },
  { value: "draft", label: "Rascunhos" },
  { value: "archived", label: "Arquivadas" },
];

function AdminAcervoTab() {
  const { hasRole } = useAuth();
  const [data, setData] = useState<AdminCatalogPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuringId, setFeaturingId] = useState<string | null>(null);

  // Filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

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
        toast.success("Destaque removido");
      }
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar destaque.");
    } finally {
      setFeaturingId(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(0);
  };

  // Filter, search, sort, paginate
  const { items, totalCount, totalPages } = useMemo(() => {
    if (!data) return { items: [], totalCount: 0, totalPages: 0 };

    let filtered = data.items;

    // Archetype filter
    if (archetypeFilter) {
      filtered = filtered.filter((i) => i.archetype === archetypeFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.slug.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.status.toLowerCase().includes(q),
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField] as string;
      const bVal = (b as Record<string, unknown>)[sortField] as string;
      const cmp = (aVal ?? "").localeCompare(bVal ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return { items: paginated, totalCount, totalPages };
  }, [data, archetypeFilter, statusFilter, search, sortField, sortDir, page]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, statusFilter, archetypeFilter]);

  return (
    <div className="space-y-8">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Catálogo de atividades</Eyebrow>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reload} disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </button>
          <button type="button"
            onClick={() => toast.info("Disponível em breve")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Adicionar
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

          {/* Archetype cards */}
          <section>
            <Eyebrow>Por arquétipo</Eyebrow>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {ARCHETYPE_LIST.map((arch) => {
                const count = data.stats.byArchetype[arch.id] ?? 0;
                const isActive = archetypeFilter === arch.id;
                return (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => setArchetypeFilter(isActive ? null : arch.id)}
                    className={`rounded-md border px-4 py-3 text-left transition-colors ${
                      isActive
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

          {/* Search + Filters */}
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por slug, título ou status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {archetypeFilter && (
                <button
                  type="button"
                  onClick={() => setArchetypeFilter(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Limpar filtro de tipo
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {totalCount} item{totalCount !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Table */}
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/60 px-6 py-14 text-center">
                <h3 className="font-display text-2xl text-foreground">
                  {search || statusFilter || archetypeFilter ? "Nenhum resultado" : "O acervo está vazio"}
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {search || statusFilter || archetypeFilter
                    ? "Tente ajustar os filtros."
                    : "A tabela está pronta no banco — só você consegue gravar aqui."}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  Toque na estrela pra trocar a atividade em destaque. Clique nas colunas pra ordenar.
                </p>
                <div className="overflow-hidden rounded-xl border border-border/50">
                  <table className="w-full text-left">
                    <thead className="bg-muted/40">
                      <tr>
                        <Th>Destaque</Th>
                        <SortableTh field="slug" current={sortField} dir={sortDir} onToggle={toggleSort}>Slug</SortableTh>
                        <SortableTh field="title" current={sortField} dir={sortDir} onToggle={toggleSort}>Título</SortableTh>
                        <SortableTh field="archetype" current={sortField} dir={sortDir} onToggle={toggleSort}>Arquétipo</SortableTh>
                        <Th>Tema</Th>
                        <SortableTh field="status" current={sortField} dir={sortDir} onToggle={toggleSort}>Status</SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
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
          </section>
        </>
      )}
    </div>
  );
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

function SortableTh({
  children,
  field,
  current,
  dir,
  onToggle,
}: {
  children: React.ReactNode;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onToggle: (f: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      <button
        type="button"
        onClick={() => onToggle(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        <ArrowUpDown className={`h-3 w-3 ${isActive ? "text-foreground" : "text-muted-foreground/50"}`} />
        {isActive && <span className="text-[0.5rem]">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}
