/**
 * /admin/insights — Catalog insights for editorial curation.
 */

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, CheckCircle2, Clock, Hourglass, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/Eyebrow";
import {
  setFeaturedActivity,
  getCatalogInsights,
  type CatalogInsights,
} from "@/server/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/insights")({
  component: AdminInsightsTab,
});

function AdminInsightsTab() {
  const [insights, setInsights] = useState<CatalogInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [featuringId, setFeaturingId] = useState<string | null>(null);
  const [currentFeaturedId, setCurrentFeaturedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    return getCatalogInsights()
      .then((res) => { setInsights(res); setErr(null); })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, []);

  const handleFeature = async (id: string, currentlyFeatured: boolean) => {
    setFeaturingId(id);
    try {
      const targetId = currentlyFeatured ? null : id;
      const res = await setFeaturedActivity({ data: { id: targetId } });
      if (res.id) {
        toast.success("Destaque atualizado", { description: `${res.title} agora aparece no topo do acervo.` });
        setCurrentFeaturedId(res.id);
      } else {
        toast.success("Destaque removido");
        setCurrentFeaturedId(null);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar destaque.");
    } finally {
      setFeaturingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <Eyebrow tone="mauve">Insights do catálogo</Eyebrow>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Dados agregados pra apoiar sua escolha de destaque. Tudo cross-workspace,
            sem nenhum dado de paciente. A decisão continua sendo sua.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
          <p className="eyebrow !text-destructive">Não consegui carregar</p>
          <p className="mt-1 text-sm text-foreground">{err}</p>
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightBlock icon={Flame} title="Mais usadas" subtitle={`Últimos ${insights.window_days} dias`}
            empty="Sem prescrições no período."
            items={insights.top_used.map((u) => ({ id: u.activity_id, title: u.title, meta: `${u.count} ${u.count === 1 ? "uso" : "usos"}` }))}
            onFeature={handleFeature} featuringId={featuringId} currentFeaturedId={currentFeaturedId} />

          <InsightBlock icon={CheckCircle2} title="Maior conclusão" subtitle="Mín. 10 envios"
            empty="Ainda sem amostra suficiente."
            items={insights.top_completion.map((c) => ({ id: c.activity_id, title: c.title, meta: `${c.completion_rate}% · ${c.total_completed}/${c.total_assigned}` }))}
            onFeature={handleFeature} featuringId={featuringId} currentFeaturedId={currentFeaturedId} />

          <InsightBlock icon={Clock} title="Última adicionada" subtitle="No catálogo"
            empty="Catálogo vazio."
            items={insights.latest_added
              ? [{ id: insights.latest_added.activity_id, title: insights.latest_added.title, meta: relativeDate(insights.latest_added.created_at) }]
              : []}
            onFeature={handleFeature} featuringId={featuringId} currentFeaturedId={currentFeaturedId} />

          <InsightBlock icon={Hourglass} title="Nunca foi destaque" subtitle="Oportunidades de descoberta"
            empty="Todas já foram destaque pelo menos uma vez."
            items={insights.never_featured.map((n) => ({ id: n.activity_id, title: n.title, meta: n.status === "published" ? "Publicada" : n.status }))}
            onFeature={handleFeature} featuringId={featuringId} currentFeaturedId={currentFeaturedId} />
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──

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

function InsightBlock({ icon: Icon, title, subtitle, empty, items, onFeature, featuringId, currentFeaturedId }: InsightBlockProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-secondary" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {items.length === 0 && <p className="text-xs text-muted-foreground">{empty}</p>}
        {items.map((item) => {
          const isCurrent = item.id === currentFeaturedId;
          const busy = featuringId === item.id;
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              </div>
              <button type="button" onClick={() => onFeature(item.id, isCurrent)} disabled={busy}
                className="shrink-0 rounded-md border border-border/60 bg-background px-2.5 py-1 text-[0.6875rem] font-medium text-foreground transition hover:bg-muted disabled:opacity-50">
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
