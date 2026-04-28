/**
 * Acervo (Library) — protótipo visual do acervo terapêutico do Terapily.
 *
 * Estado atual (S1): protótipo visual apenas.
 * - Lê de `src/features/library/catalog.ts` (seed mockado de 8 atividades)
 * - Botões "Em sessão" / "Enviar" mostram toast informando que o player
 *   chega em S3 — sem fluxo fake, voz Terapily ("autoridade calma")
 * - Sem chamadas ao banco, sem player real, sem magic link
 *
 * Em S3 (Activity catalog + delivery_mode):
 * - Substitui import de `catalog.ts` por server function `getActivityCatalog()`
 * - Botões abrem rota `/library/$activityId/play` (full-screen overlay)
 * - Tabela `activity_catalog` no banco com RLS por workspace
 *
 * NENHUM componente desta página precisa mudar quando isso acontecer —
 * o shape `Activity` foi desenhado pra ser idêntico ao da tabela.
 */

import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { CategoryRow } from "@/features/library/CategoryRow";
import { ARCHETYPE_LIST } from "@/features/library/archetypes";
import {
  CATEGORIES,
  getActivitiesByCategory,
  type Activity,
} from "@/features/library/catalog";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Acervo · Terapily" },
      {
        name: "description",
        content:
          "Acervo de ferramentas terapêuticas — escalas validadas, formulários guiados e exercícios entre sessões.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const handleStart = (activity: Activity, mode: "in_session" | "shared_link") => {
    // Em S3 substituirá isto por navigate({ to: "/library/$id/play", ... })
    toast(activity.name, {
      description:
        mode === "in_session"
          ? "O player ao vivo chega na Semana 3."
          : "O envio por link chega na Semana 3.",
    });
  };

  return (
    <div className="pb-20">
      {/* Hero editorial — mesma linguagem do dashboard */}
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-8 sm:pt-14">
        <Eyebrow>Acervo</Eyebrow>
        <h1 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
          Ferramentas para a próxima sessão.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Escalas validadas, registros guiados e exercícios entre sessões.
          Aplique ao vivo ou envie ao paciente — sem que ele precise criar conta.
        </p>

        {/* Faixa de meta-info do acervo — discreta, editorial */}
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/60 pt-6 sm:grid-cols-4">
          <MetaCell label="Categorias" value={CATEGORIES.length.toString()} />
          <MetaCell
            label="Ferramentas"
            value={CATEGORIES.reduce(
              (sum, c) => sum + getActivitiesByCategory(c.id).length,
              0,
            ).toString()}
          />
          <MetaCell
            label="Arquétipos"
            value={ARCHETYPE_LIST.length.toString()}
            hint="motores reutilizáveis"
          />
          <MetaCell label="Modos" value="3" hint="sessão · link · ambos" />
        </dl>
      </header>

      {/* Carrosséis por categoria */}
      <div className="space-y-12">
        {CATEGORIES.map((category) => {
          const items = getActivitiesByCategory(category.id);
          if (items.length === 0) return null;
          return (
            <CategoryRow
              key={category.id}
              category={category}
              activities={items}
              onStart={handleStart}
            />
          );
        })}
      </div>

      {/* Nota de protótipo — voz Terapily, honestidade explícita */}
      <footer className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
        <div className="rounded-lg border border-dashed border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary-foreground/80">
            Visualização · Semana 1
          </p>
          <p className="mt-2">
            Esta é a estética final do acervo. O catálogo completo de 80+
            ferramentas, o player ao vivo e o envio por link entram na
            Semana 3, junto com a tabela do banco e o controle de acesso por
            espaço de trabalho.
          </p>
        </div>
      </footer>
    </div>
  );
}

function MetaCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl text-foreground">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}
