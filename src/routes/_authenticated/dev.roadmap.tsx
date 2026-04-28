import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_ROADMAP,
  ARCHETYPE_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  type Archetype,
  type ActivityStatus,
} from "@/features/dev/activityRoadmap";

export const Route = createFileRoute("/_authenticated/dev/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap do acervo · Terapily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DevRoadmapPage,
});

function DevRoadmapPage() {
  const { hasRole, isLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [archetype, setArchetype] = useState<Archetype | "all">("all");
  const [status, setStatus] = useState<ActivityStatus | "all">("all");
  const [week, setWeek] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTIVITY_ROADMAP.filter((a) => {
      if (archetype !== "all" && a.archetype !== archetype) return false;
      if (status !== "all" && a.status !== status) return false;
      if (week !== "all" && a.week !== week) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.approach.toLowerCase().includes(q)
      );
    });
  }, [query, archetype, status, week]);

  const counts = useMemo(() => {
    const byArchetype: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const a of ACTIVITY_ROADMAP) {
      byArchetype[a.archetype] = (byArchetype[a.archetype] ?? 0) + 1;
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }
    return { byArchetype, byStatus, total: ACTIVITY_ROADMAP.length };
  }, []);

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  if (!hasRole("admin")) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <Eyebrow>Acesso restrito</Eyebrow>
        <h1 className="font-display text-3xl text-foreground">
          Página interna de desenvolvimento
        </h1>
        <p className="text-muted-foreground">
          Esta tela é só para administradores acompanharem o roadmap do acervo.
        </p>
        <Link to="/dashboard" className="text-primary underline">
          Voltar ao painel
        </Link>
      </div>
    );
  }

  const weeks = Array.from(new Set(ACTIVITY_ROADMAP.map((a) => a.week))).sort();
  const archetypes = Object.keys(ARCHETYPE_LABEL) as Archetype[];
  const statuses = Object.keys(STATUS_LABEL) as ActivityStatus[];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Eyebrow>Dev · Interno</Eyebrow>
        <h1 className="font-display text-3xl text-foreground">
          Roadmap do acervo
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {counts.total} atividades catalogadas. Cada uma mapeada para um
          arquétipo de tool/jogo (timer, drag &amp; drop, tagging, sentence
          builder…) e a semana planejada de construção. Esta lista vira a
          tabela <code>activity_catalog</code> em S2.5/S3.
        </p>
      </header>

      {/* Resumo */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total" value={counts.total} />
        <SummaryCard
          label="Prontas"
          value={counts.byStatus.ready ?? 0}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryCard
          label="Em construção"
          value={counts.byStatus.in_progress ?? 0}
          tone="text-primary"
        />
        <SummaryCard
          label="Planejadas"
          value={counts.byStatus.planned ?? 0}
          tone="text-muted-foreground"
        />
      </section>

      {/* Filtros */}
      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Buscar por nome ou código…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          value={archetype}
          onValueChange={(v) => setArchetype(v as Archetype | "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Arquétipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os arquétipos</SelectItem>
            {archetypes.map((a) => (
              <SelectItem key={a} value={a}>
                {ARCHETYPE_LABEL[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ActivityStatus | "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={week} onValueChange={setWeek}>
          <SelectTrigger>
            <SelectValue placeholder="Semana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as semanas</SelectItem>
            {weeks.map((w) => (
              <SelectItem key={w} value={w}>
                {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Tabela */}
      <section className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Atividade</th>
                <th className="px-4 py-3">Abordagem</th>
                <th className="px-4 py-3">Arquétipo</th>
                <th className="px-4 py-3">Semana</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr key={a.code} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {a.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {a.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.approach}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {ARCHETYPE_LABEL[a.archetype]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {a.week}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.notes ?? "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Nenhuma atividade encontrada com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Distribuição por arquétipo */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-lg text-foreground">
          Distribuição por arquétipo
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {archetypes.map((a) => (
            <div
              key={a}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{ARCHETYPE_LABEL[a]}</span>
              <span className="font-medium text-foreground">
                {counts.byArchetype[a] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-display text-3xl ${tone ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
