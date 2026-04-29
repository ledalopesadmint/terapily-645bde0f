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
import { Plus, Sparkles, FileText, Archive, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import {
  getAdminCatalog,
  type AdminCatalogPayload,
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

  // Gate de role no client (defesa em camada — RLS do banco já bloqueia).
  // Usamos useEffect+navigate em vez de beforeLoad porque a sessão Supabase
  // vive no localStorage e não está disponível no SSR.
  useEffect(() => {
    if (!isLoading && !hasRole("admin")) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoading, hasRole, navigate]);

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
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-left">
              <thead className="bg-muted/40">
                <tr>
                  <Th>Slug</Th>
                  <Th>Título</Th>
                  <Th>Arquétipo</Th>
                  <Th>Tema</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border/50 hover:bg-muted/30"
                  >
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
                ))}
              </tbody>
            </table>
          </div>
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
