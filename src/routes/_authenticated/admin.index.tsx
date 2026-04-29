/**
 * /admin — painel exclusivo da Leda (admin@terapily.com).
 *
 * S1 (somente leitura):
 * - Confere acesso via hasRole('admin'); redireciona pra /dashboard se não for
 * - Mostra estatísticas do catálogo (total / publicado / rascunho / arquivado)
 * - Lista atividades cadastradas (vazia hoje — seed do banco vem em S3)
 * - Botão "Adicionar atividade" mostra toast "chega em S3" (sem fluxo fake)
 *
 * S3 (Activity Catalog completo):
 * - Botão abre formulário de criação (slug, título, arquétipo, tema, JSON config)
 * - Lista vira tabela editável (mudar status, destacar, arquivar)
 * - Toggle "Visualizar como terapeuta" abre /library com workspace de demo
 *
 * Estética: brand book v3. Eyebrow MAUVE + título Cormorant. Stats em cream-card.
 * NADA do que aparece aqui é fake — números vêm do banco real.
 */

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles, FileText, Archive, ShieldCheck, RefreshCw, Star, Flame, CheckCircle2, Clock, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import {
  getAdminCatalog,
  setFeaturedActivity,
  getCatalogInsights,
  type AdminCatalogPayload,
  type CatalogInsights,
} from "@/server/admin.functions";
import { syncStripeCatalog } from "@/features/billing/admin.functions";
import { ARCHETYPE_LIST } from "@/features/library/archetypes";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHomePage,
});

function AdminHomePage() {
  const { hasRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminCatalogPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuringId, setFeaturingId] = useState<string | null>(null);

  // Gate de role no client (defesa em camada — RLS do banco já bloqueia).
  // Usamos useEffect+navigate em vez de beforeLoad porque a sessão Supabase
  // vive no localStorage e não está disponível no SSR.
  useEffect(() => {
    if (!isLoading && !hasRole("admin")) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoading, hasRole, navigate]);

  const reload = () => {
    setLoading(true);
    return getAdminCatalog()
      .then((res) => {
        setData(res);
        setLoadError(null);
      })
      .catch((err: Error) => {
        setLoadError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!hasRole("admin")) return;
    let cancelled = false;
    setLoading(true);
    getAdminCatalog()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoadError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasRole]);

  const handleToggleFeatured = async (id: string, currentlyFeatured: boolean) => {
    setFeaturingId(id);
    try {
      // Clicar na atividade já em destaque desliga; clicar em outra troca.
      const targetId = currentlyFeatured ? null : id;
      const res = await setFeaturedActivity({ data: { id: targetId } });
      if (res.id) {
        toast.success("Destaque atualizado", {
          description: `${res.title} agora aparece no topo do acervo.`,
        });
      } else {
        toast.success("Destaque removido", {
          description: "O acervo vai exibir o fallback editorial.",
        });
      }
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar destaque.");
    } finally {
      setFeaturingId(null);
    }
  };


  if (isLoading || !hasRole("admin")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="eyebrow text-muted-foreground">Verificando acesso</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
      {/* Header editorial */}
      <header className="flex flex-col gap-6 border-b border-border/50 pb-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-3">
          <Eyebrow>Painel administrativo</Eyebrow>
          <h1 className="font-display text-4xl text-foreground md:text-5xl">
            Curadoria do acervo
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Aqui você gerencia as ferramentas terapêuticas que aparecem para
            todos os terapeutas da plataforma. Tudo o que for publicado vira
            disponível em segundos para quem está em sessão.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() =>
              toast.info("Disponível em breve", {
                description:
                  "O criador de atividades chega na Semana 3, junto com o Player. Por enquanto, esta tela é só de leitura.",
              })
            }
            className="
              inline-flex items-center gap-2 rounded-md
              bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
              transition-colors hover:bg-primary/90
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <Plus className="h-4 w-4" />
            Adicionar atividade
          </button>
        </div>
      </header>

      {/* Stats */}
      <section aria-label="Resumo do catálogo" className="mt-10">
        {loading && (
          <p className="eyebrow text-muted-foreground">Carregando catálogo</p>
        )}

        {loadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
            <p className="eyebrow !text-destructive">Não consegui carregar</p>
            <p className="mt-1 text-sm text-foreground">{loadError}</p>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={Sparkles}
              label="Publicadas"
              value={data.stats.published}
              accent="sage"
            />
            <StatCard
              icon={FileText}
              label="Rascunhos"
              value={data.stats.draft}
              accent="mauve"
            />
            <StatCard
              icon={Archive}
              label="Arquivadas"
              value={data.stats.archived}
              accent="cream"
            />
            <StatCard
              icon={ShieldCheck}
              label="Total no banco"
              value={data.stats.total}
              accent="navy"
            />
          </div>
        )}
      </section>

      {/* Distribuição por arquétipo */}
      {data && (
        <section aria-label="Distribuição por arquétipo" className="mt-10">
          <Eyebrow>Por arquétipo</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {ARCHETYPE_LIST.map((arch) => {
              const count = data.stats.byArchetype[arch.id] ?? 0;
              return (
                <div
                  key={arch.id}
                  className="rounded-md border border-border/50 bg-card px-4 py-3"
                >
                  <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                    {arch.shortLabel}
                  </p>
                  <p className="mt-1 font-display text-2xl text-foreground">
                    {count}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Insights do catálogo (curadoria manual com base em dados reais) */}
      <InsightsSection
        onFeature={handleToggleFeatured}
        featuringId={featuringId}
        currentFeaturedId={data?.items.find((i) => i.is_featured)?.id ?? null}
      />

      {/* Billing — sync catálogo Stripe */}
      <BillingSyncSection />

      {/* Lista de atividades */}
      <section aria-label="Atividades cadastradas" className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <Eyebrow>Atividades cadastradas</Eyebrow>
          {data && (
            <span className="text-xs text-muted-foreground">
              {data.items.length === 0
                ? "Nenhuma ainda"
                : `${data.items.length} item${data.items.length === 1 ? "" : "s"}`}
            </span>
          )}
        </div>

        {data && data.items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/60 px-6 py-14 text-center">
            <h3 className="font-display text-2xl text-foreground">
              O acervo ainda está vazio
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              A tabela está pronta no banco e protegida — só você consegue
              gravar aqui. O formulário de criação chega na Semana 3, quando o
              Player que executa as atividades for ligado.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Hoje, o protótipo visual em <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">/library</code> usa
              uma seed local com 8 atividades para validar a estética.
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Toque na estrela pra trocar a atividade que aparece em destaque no
              topo do <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">/library</code>.
              Apenas uma fica ativa por vez.
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
                  {data.items.map((item) => {
                    const busy = featuringId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="border-t border-border/50 hover:bg-muted/30"
                        data-featured={item.is_featured ? "true" : undefined}
                      >
                        <Td>
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                            disabled={busy}
                            aria-pressed={item.is_featured}
                            aria-label={
                              item.is_featured
                                ? `Remover ${item.title} do destaque`
                                : `Definir ${item.title} como destaque`
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Star
                              className={`h-4 w-4 ${item.is_featured ? "fill-secondary text-secondary" : "text-muted-foreground"}`}
                              aria-hidden
                            />
                          </button>
                        </Td>
                        <Td>
                          <code className="font-mono text-xs text-muted-foreground">
                            {item.slug}
                          </code>
                        </Td>
                        <Td className="font-medium text-foreground">{item.title}</Td>
                        <Td className="text-muted-foreground">{item.archetype}</Td>
                        <Td>
                          <span
                            data-theme={item.theme.replace("_", "-")}
                            className="inline-flex items-center gap-1.5 text-xs"
                          >
                            <span
                              aria-hidden
                              className="h-2.5 w-2.5 rounded-full [background-color:var(--activity-accent)]"
                            />
                            {item.theme}
                          </span>
                        </Td>
                        <Td>
                          <StatusPill status={item.status} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: typeof Sparkles;
  label: string;
  value: number;
  accent: "sage" | "mauve" | "navy" | "cream";
}

function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  return (
    <div
      data-theme={accent}
      className="
        relative overflow-hidden rounded-xl border border-border/50 bg-card
        px-5 py-5 transition-shadow
        hover:[box-shadow:0_12px_30px_-18px_var(--activity-glow)]
      "
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] [background-color:var(--activity-accent)] opacity-80"
      />
      <Icon
        className="h-4 w-4 [color:var(--activity-accent)]"
        aria-hidden
      />
      <p className="mt-3 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: {
      label: "Publicada",
      cls: "bg-secondary/15 text-secondary-foreground",
    },
    draft: {
      label: "Rascunho",
      cls: "bg-mauve/20 text-mauve-foreground",
    },
    archived: {
      label: "Arquivada",
      cls: "bg-muted text-muted-foreground",
    },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}

function BillingSyncSection() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<Array<{ tier: string; price_id: string; amount: number }> | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncStripeCatalog();
      setResult(res.synced);
      toast.success(`Catálogo sincronizado (${res.synced.length} planos).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section aria-label="Catálogo de billing" className="mt-12">
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <Eyebrow tone="mauve">Stripe · catálogo</Eyebrow>
            <h3 className="mt-2 font-display text-2xl text-foreground">
              Sincronizar planos
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Lê os <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">price_id</code> declarados em
              {" "}<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">STRIPE_PRICE_BASIC</code> e
              {" "}<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">STRIPE_PRICE_PRACTICE</code>,
              busca preço/produto na Stripe e atualiza a tabela <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">stripe_products</code>.
              Idempotente — pode rodar quantas vezes precisar.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
            {syncing ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        </div>

        {result && result.length > 0 && (
          <ul className="mt-5 space-y-1.5 text-sm">
            {result.map((r) => (
              <li key={r.price_id} className="flex items-center gap-3 text-muted-foreground">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
                <span className="font-medium text-foreground capitalize">{r.tier}</span>
                <span>·</span>
                <span>${(r.amount / 100).toFixed(2)}</span>
                <span>·</span>
                <code className="font-mono text-xs">{r.price_id}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// InsightsSection — painel de curadoria manual baseado em dados reais.
//
// Sem PHI. Tudo agregado por activity_id no servidor (getCatalogInsights).
// Cada item tem botão "Definir como destaque" que reusa setFeaturedActivity
// — o mesmo fluxo da estrela na tabela.
//
// FUTURE (S5/S6):
// considerar modo automático com:
// - mínimo de uso (ex: 50)
// - fallback manual
// - opt-in no admin
// ────────────────────────────────────────────────────────────────────────────

interface InsightsSectionProps {
  onFeature: (id: string, currentlyFeatured: boolean) => Promise<void>;
  featuringId: string | null;
  currentFeaturedId: string | null;
}

function InsightsSection({ onFeature, featuringId, currentFeaturedId }: InsightsSectionProps) {
  const [insights, setInsights] = useState<CatalogInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    return getCatalogInsights()
      .then((res) => {
        setInsights(res);
        setErr(null);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCatalogInsights()
      .then((res) => {
        if (!cancelled) {
          setInsights(res);
          setErr(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentFeaturedId]); // recarrega quando o destaque muda

  return (
    <section aria-label="Insights do catálogo" className="mt-12">
      <div className="mb-4 flex items-baseline justify-between">
        <Eyebrow tone="mauve">Insights do catálogo</Eyebrow>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Dados agregados pra apoiar sua escolha de destaque. Tudo cross-workspace,
        sem nenhum dado de paciente. A decisão continua sendo sua —
        automatizar o destaque cria viés de feedback e some com a curadoria editorial.
      </p>

      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
          <p className="eyebrow !text-destructive">Não consegui carregar</p>
          <p className="mt-1 text-sm text-foreground">{err}</p>
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightBlock
            icon={Flame}
            title="Mais usadas"
            subtitle={`Últimos ${insights.window_days} dias`}
            empty="Sem prescrições no período."
            items={insights.top_used.map((u) => ({
              id: u.activity_id,
              title: u.title,
              meta: `${u.count} ${u.count === 1 ? "uso" : "usos"}`,
            }))}
            onFeature={onFeature}
            featuringId={featuringId}
            currentFeaturedId={currentFeaturedId}
          />

          <InsightBlock
            icon={CheckCircle2}
            title="Maior conclusão"
            subtitle="Mín. 10 envios"
            empty="Ainda sem amostra suficiente."
            items={insights.top_completion.map((c) => ({
              id: c.activity_id,
              title: c.title,
              meta: `${c.completion_rate}% · ${c.total_completed}/${c.total_assigned}`,
            }))}
            onFeature={onFeature}
            featuringId={featuringId}
            currentFeaturedId={currentFeaturedId}
          />

          <InsightBlock
            icon={Clock}
            title="Última adicionada"
            subtitle="No catálogo"
            empty="Catálogo vazio."
            items={
              insights.latest_added
                ? [
                    {
                      id: insights.latest_added.activity_id,
                      title: insights.latest_added.title,
                      meta: relativeDate(insights.latest_added.created_at),
                    },
                  ]
                : []
            }
            onFeature={onFeature}
            featuringId={featuringId}
            currentFeaturedId={currentFeaturedId}
          />

          <InsightBlock
            icon={Hourglass}
            title="Nunca foi destaque"
            subtitle="Oportunidades de descoberta"
            empty="Todas já foram destaque pelo menos uma vez."
            items={insights.never_featured.map((n) => ({
              id: n.activity_id,
              title: n.title,
              meta: n.status === "published" ? "Publicada" : n.status,
            }))}
            onFeature={onFeature}
            featuringId={featuringId}
            currentFeaturedId={currentFeaturedId}
          />
        </div>
      )}
    </section>
  );
}

interface InsightBlockProps {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string }>;
  onFeature: (id: string, currentlyFeatured: boolean) => Promise<void>;
  featuringId: string | null;
  currentFeaturedId: string | null;
}

function InsightBlock({
  icon: Icon,
  title,
  subtitle,
  empty,
  items,
  onFeature,
  featuringId,
  currentFeaturedId,
}: InsightBlockProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-secondary" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">{empty}</p>
        )}
        {items.map((item) => {
          const isCurrent = item.id === currentFeaturedId;
          const busy = featuringId === item.id;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              </div>
              <button
                type="button"
                onClick={() => onFeature(item.id, isCurrent)}
                disabled={busy}
                className="shrink-0 rounded-md border border-border/60 bg-background px-2.5 py-1 text-[0.6875rem] font-medium text-foreground transition hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isCurrent ? "Em destaque" : busy ? "…" : "Destacar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}
