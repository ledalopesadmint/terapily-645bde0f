/**
 * Acervo (Library) — protótipo visual do acervo terapêutico do Terapily.
 *
 * Estrutura editorial (referência premium):
 *   1. Cabeçalho editorial curto
 *   2. Featured tool (hero Navy gradient)
 *   3. Featured carousel (carrossel horizontal de cards verticais)
 *   4. Browse by category (grid de cards quadrados, "Em breve" honesto)
 *   5. Recommended for you (estado vazio honesto até S3)
 *
 * Estado atual (S1): protótipo visual.
 * - Lê de `src/features/library/catalog.ts` (seed mockado de 8 atividades)
 * - Botões mostram toast informando que o player chega em S3
 *
 * Em S3:
 * - Substitui `catalog.ts` por server function `getActivityCatalog()`
 * - Botões abrem `/library/$activityId/play`
 * - Browse mostra contagem real por categoria
 * - Recommended lê de `activity_reports` + perfil de pacientes
 */

import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CategoryRow } from "@/features/library/CategoryRow";
import { LibraryHero } from "@/features/library/LibraryHero";
import { CategoryBrowser } from "@/features/library/CategoryBrowser";
import { RecommendedEmpty } from "@/features/library/RecommendedEmpty";
import {
  ACTIVITIES,
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
    toast(activity.name, {
      description:
        mode === "in_session"
          ? "O player ao vivo chega na Semana 3."
          : "O envio por link chega na Semana 3.",
    });
  };

  // Featured = primeira escala validada do seed (PHQ-9 — Navy theme)
  const featured = ACTIVITIES.find((a) => a.code === "PHQ-9") ?? ACTIVITIES[0];
  const liveCategoryIds = CATEGORIES.map((c) => c.id);

  return (
    <div className="pb-20">
      {/* Cabeçalho editorial — discreto, deixa o hero brilhar */}
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-8 sm:pt-12">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
          Acervo
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-foreground sm:text-[2.5rem]">
          Ferramentas para a próxima sessão.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Escalas validadas, registros guiados e exercícios entre sessões.
          Aplique ao vivo ou envie ao paciente — sem que ele precise criar conta.
        </p>
      </header>

      {/* Hero Navy gradient */}
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <LibraryHero activity={featured} onStart={handleStart} />
      </div>

      {/* Carrosséis por categoria */}
      <div className="mt-14 space-y-12">
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

      {/* Browse by category */}
      <div className="mt-16">
        <CategoryBrowser liveCategoryIds={liveCategoryIds} />
      </div>

      {/* Recommended (estado vazio honesto) */}
      <div className="mt-16">
        <RecommendedEmpty />
      </div>

      {/* Nota de protótipo — voz Terapily */}
      <footer className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
        <div className="rounded-lg border border-dashed border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-secondary-foreground/80">
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
