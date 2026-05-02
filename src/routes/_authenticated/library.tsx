/**
 * Acervo (Library) — protótipo visual + modo seleção.
 *
 * Modo padrão (sem `selectFor`): visualização editorial S1 (seed mockado).
 *
 * Modo seleção (com `selectFor=PATIENT_UUID`):
 *  - Header sticky "Selecionando atividade para [Apelido] · Voltar"
 *  - Cards do seed que correspondem a uma atividade real no banco ganham
 *    o CTA "Visualizar". Os outros ficam com badge "Em breve".
 *  - Clicar em "Visualizar" abre Sheet lateral com preview detalhada e
 *    botão final "Selecionar esta atividade".
 *  - Confirmar → navega de volta para `returnTo` com search params que
 *    pré-preenchem o modal de envio em /patients/$id.
 *
 * Search params (todos opcionais, validados por Zod):
 *  - selectFor: UUID do paciente (gatilho do modo seleção)
 *  - returnTo:  caminho relativo de retorno (ex: /patients/UUID)
 *  - mode:      delivery_mode pré-escolhido pelo terapeuta
 *  - days:      dias de expiração do link
 *
 * Regras (magic-link-rules-locked):
 *  - URL contém apenas UUIDs e enums não-PHI.
 *  - Validação real (workspace+therapist+activity) acontece no servidor
 *    quando o terapeuta clica "Gerar" no modal de envio.
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, BookOpen, Clock, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { LibraryHero } from "@/features/library/LibraryHero";
import { InSessionQuickAccess } from "@/features/library/InSessionQuickAccess";
import { ResourceBox } from "@/features/library/ResourceBox";
import type { Activity } from "@/features/library/library.types";
import {
  ACTIVITIES,
} from "@/features/library/seed-data";
import { Activity as ActivityIcon, FileText, Sparkles } from "lucide-react";
import { listAvailableActivities } from "@/features/activities/activities.functions";
import { getFeaturedActivity } from "@/server/admin.functions";
import { getPatientNickname } from "@/features/patients/patients.functions";
import { useAuth } from "@/features/auth/AuthProvider";
import { PatientPickerSheet } from "@/features/library/PatientPickerSheet";

const librarySearchSchema = z.object({
  selectFor: z.string().uuid().optional(),
  returnTo: z.string().regex(/^\/[a-zA-Z0-9/_$-]*$/).optional(),
  mode: z.enum(["in_session", "shared_link", "both"]).optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
  // Quando o terapeuta abre o Sheet de preview de uma atividade específica.
  preview: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/library")({
  validateSearch: librarySearchSchema,
  head: () => ({
    meta: [
      { title: "Acervo · Terapily" },
      {
        name: "description",
        content:
          "Acervo de ferramentas terapêuticas — escalas validadas, formulários guiados e exercícios entre sessões.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const search = Route.useSearch();
  const isSelectionMode = !!search.selectFor;

  if (isSelectionMode) {
    return <LibrarySelectionMode />;
  }
  return <LibraryStandardMode />;
}

// =============================================================================
// Modo padrão (visualização editorial)
// =============================================================================

function LibraryStandardMode() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerActivity, setPickerActivity] = useState<Activity | null>(null);
  const [pickerMode, setPickerMode] = useState<"in_session" | "shared_link">("in_session");

  const handleStart = (activity: Activity, mode: "in_session" | "shared_link") => {
    setPickerActivity(activity);
    setPickerMode(mode);
    setPickerOpen(true);
  };

  // Curadoria semanal: admin define no /admin via toggle "Destaque".
  // Cai pro PHQ-9 do seed se nada estiver marcado ou se não houver acesso.
  const fallback = ACTIVITIES.find((a) => a.code === "PHQ-9") ?? ACTIVITIES[0];
  const featuredQuery = useQuery({
    queryKey: ["library", "featured", auth.workspace?.id ?? null],
    queryFn: () =>
      getFeaturedActivity({
        data: auth.workspace?.id ? { workspaceId: auth.workspace.id } : {},
      }),
    enabled: !auth.isLoading,
    staleTime: 60_000,
  });

  // Mapeia row do banco → shape Activity. Reusa illustration/duration do seed
  // quando o slug bate; senão deriva campos visuais defensivos.
  const featured: Activity = useMemo(() => {
    const row = featuredQuery.data;
    if (!row) return fallback;
    const seedMatch = ACTIVITIES.find(
      (a) => a.id === row.slug || a.code.toLowerCase() === row.slug,
    );
    const cfg = (row.config ?? {}) as { estimated_minutes?: number; supported_modes?: Activity["supportedModes"] };
    return {
      id: row.id,
      code: (cfg as { code?: string }).code ?? seedMatch?.code ?? row.slug.toUpperCase(),
      name: row.title,
      approach: seedMatch?.approach ?? "Atividade",
      category: seedMatch?.category ?? "anxiety",
      archetype: row.archetype as Activity["archetype"],
      theme: (row.theme === "sage_dark" ? "sage-dark" : row.theme) as Activity["theme"],
      durationMin: cfg.estimated_minutes ?? seedMatch?.durationMin ?? 5,
      shortDescription: row.short_description,
      illustration: seedMatch?.illustration ?? "petals",
      supportedModes: cfg.supported_modes ?? seedMatch?.supportedModes ?? ["in_session"],
    };
  }, [featuredQuery.data, fallback]);

  return (
    <div className="pb-20">
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

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <LibraryHero activity={featured} onStart={handleStart} />
      </div>

      {/* ── Resource boxes ── */}
      <div className="mt-10">
        <InSessionQuickAccess
          activities={ACTIVITIES}
          onStartInSession={(activity) => handleStart(activity, "in_session")}
        />
      </div>

      <div className="mt-6">
        <ResourceBox
          icon={FileText}
          title="Worksheets"
          subtitle="Registros guiados que transformam o espaço entre sessões em progresso real. Aplique em sessão ou envie como atividade entre sessões."
          href="/worksheets"
          count={16}
          countLabel="worksheets"
        />
      </div>

      {/* ── Recomendados (S3 — ativo quando houver histórico de uso) ── */}
      <div className="mt-10 mx-auto max-w-6xl px-4 sm:px-8">
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/15 text-sage">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-terracotta">
                Recomendado pra você
              </p>
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                Baseado nas suas sessões recentes
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Assim que você começar a aplicar ferramentas com pacientes, o
            Terapily sugere o que faz sentido pra cada perfil.
          </p>
        </div>
      </div>

      {/* CategoryBrowser placeholder — espaço reservado para navegação futura por categoria clínica */}

      {/* footer placeholder removed — player and magic link are live */}

      {/* Gaveta de seleção de paciente (in_session) */}
      <PatientPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activity={pickerActivity}
        workspaceId={auth.workspace?.id}
        mode={pickerMode}
      />
    </div>
  );
}

// =============================================================================
// Modo seleção (chamado a partir do modal de envio em /patients/$id)
// =============================================================================

type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  archetype: string;
  short_description: string;
  category: string;
  status: string;
  theme: string;
  config: Record<string, unknown> | null;
};

function LibrarySelectionMode() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const patientId = search.selectFor!;

  const nicknameQuery = useQuery({
    queryKey: ["patient-nickname", patientId],
    queryFn: () => getPatientNickname({ data: { id: patientId } }),
  });

  const catalogQuery = useQuery({
    queryKey: ["activity-catalog", nicknameQuery.data?.workspaceId],
    queryFn: () =>
      listAvailableActivities({
        data: { workspaceId: nicknameQuery.data!.workspaceId },
      }),
    enabled: !!nicknameQuery.data?.workspaceId,
  });

  const realActivities = (catalogQuery.data?.activities ?? []) as CatalogRow[];

  // Match seed ↔ banco: por code (config.code) ou slug normalizado
  const matchByCode = useMemo(() => {
    const map = new Map<string, CatalogRow>();
    for (const a of realActivities) {
      const code = (a.config?.code as string | undefined) ?? null;
      if (code) map.set(code.toLowerCase(), a);
      map.set(a.slug.toLowerCase(), a);
    }
    return map;
  }, [realActivities]);

  const findReal = (act: Activity): CatalogRow | undefined =>
    matchByCode.get(act.code.toLowerCase()) ??
    matchByCode.get(act.id.toLowerCase());

  const previewActivity = search.preview
    ? realActivities.find((a) => a.id === search.preview) ?? null
    : null;

  // Encontra o seed correspondente (pra mostrar a copy editorial no preview)
  const previewSeed = previewActivity
    ? ACTIVITIES.find(
        (a) =>
          a.code.toLowerCase() ===
            ((previewActivity.config?.code as string | undefined)?.toLowerCase() ??
              "") || a.id.toLowerCase() === previewActivity.slug.toLowerCase(),
      ) ?? null
    : null;

  const goBack = () => {
    if (search.returnTo) {
      navigate({ to: search.returnTo });
    } else {
      navigate({ to: "/patients/$id", params: { id: patientId } });
    }
  };

  const openPreview = (real: CatalogRow) => {
    navigate({
      to: "/library",
      search: (prev: Record<string, unknown>) => ({ ...prev, preview: real.id }),
    });
  };

  const closePreview = () => {
    navigate({
      to: "/library",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next.preview;
        return next;
      },
    });
  };

  const confirmSelection = () => {
    if (!previewActivity) return;
    // Volta pro paciente. O pré-fill via search params no /patients/$id
    // entra na próxima etapa (validateSearch + useEffect que abre o modal).
    // Por ora, mostra toast confirmando a escolha pra não quebrar o fluxo.
    toast.success("Atividade selecionada", {
      description: `${previewActivity.title} — abra "Enviar atividade" no perfil do paciente.`,
    });
    navigate({
      to: search.returnTo ?? `/patients/${patientId}`,
    });
  };

  const nickname = nicknameQuery.data?.displayName ?? "…";
  const hasPreview = realActivities.length > 0;

  return (
    <div className="pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
                Selecionando atividade
              </p>
              <p className="truncate text-sm font-medium text-foreground">
                Para {nickname}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>

      <header className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-8">
        <h1 className="font-display text-2xl leading-tight text-foreground sm:text-3xl">
          Escolha uma ferramenta para enviar.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Apenas as atividades disponíveis no seu workspace ficam selecionáveis.
          As demais aparecem com a etiqueta "Em breve".
        </p>
        {!hasPreview && !catalogQuery.isLoading && (
          <p className="mt-3 rounded-md border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
            Nenhuma atividade publicada para o seu workspace ainda.
          </p>
        )}
      </header>

      {/* Lista compacta de cards (sem hero, sem carrossel — foco na seleção) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVITIES.map((act) => {
            const real = findReal(act);
            const available = !!real;
            return (
              <Card
                key={act.id}
                className={
                  available
                    ? "transition-shadow hover:shadow-md"
                    : "opacity-60"
                }
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {act.code}
                      </p>
                      <p className="font-medium text-foreground">{act.name}</p>
                    </div>
                    {available ? (
                      <Badge variant="secondary" className="shrink-0">
                        Disponível
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        Em breve
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {act.shortDescription}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" /> {act.durationMin} min
                    </span>
                    <Button
                      size="sm"
                      variant={available ? "default" : "outline"}
                      disabled={!available}
                      onClick={() => real && openPreview(real)}
                    >
                      Visualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sheet lateral de preview */}
      <Sheet open={!!previewActivity} onOpenChange={(o) => !o && closePreview()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {previewActivity && (
            <>
              <SheetHeader className="space-y-2 text-left">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-mauve">
                  {(previewActivity.config?.code as string | undefined) ??
                    previewActivity.slug}
                </p>
                <SheetTitle className="font-display text-2xl leading-tight">
                  {previewActivity.title}
                </SheetTitle>
                <SheetDescription>
                  {previewActivity.short_description}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5 text-sm">
                <PreviewRow label="Tipo" value={archetypeLabel(previewActivity.archetype)} />
                <PreviewRow
                  label="Categoria"
                  value={categoryLabel(previewActivity.category)}
                />
                <PreviewRow
                  label="Itens"
                  value={
                    (previewActivity.config?.items_count as number | undefined)
                      ? `${previewActivity.config?.items_count} perguntas`
                      : "—"
                  }
                />
                <PreviewRow
                  label="Tempo estimado"
                  value={
                    (previewActivity.config?.duration_min as number | undefined)
                      ? `${previewActivity.config?.duration_min} min`
                      : previewSeed
                        ? `${previewSeed.durationMin} min`
                        : "—"
                  }
                />
                <PreviewRow
                  label="Modos disponíveis"
                  value={modesLabel(
                    (previewActivity.config?.supported_modes as string[] | undefined) ??
                      [],
                  )}
                />
                {previewActivity.archetype === "quiz_scale" &&
                  previewActivity.config?.score_range != null && (
                    <PreviewRow
                      label="Faixa de score"
                      value={`${
                        (previewActivity.config?.score_range as number[])[0]
                      }–${(previewActivity.config?.score_range as number[])[1]}`}
                    />
                  )}

                {(previewActivity.config?.items_implemented === false ||
                  previewActivity.config?.scoring_implemented === false) && (
                  <div className="rounded-md border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Preview interno
                    </p>
                    <p className="mt-1">
                      Os itens e o scoring desta atividade ainda não foram
                      configurados. O link de teste pode ser gerado, mas o
                      paciente ainda não consegue preencher.
                    </p>
                  </div>
                )}

                {typeof previewActivity.config?.disclaimer === "string" && (
                  <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs text-secondary-foreground">
                    <p className="font-medium">Aviso clínico</p>
                    <p className="mt-1">
                      {previewActivity.config.disclaimer as string}
                    </p>
                  </div>
                )}

                {previewActivity.archetype === "quiz_scale" && (
                  <p className="rounded-md border border-border bg-muted/30 p-3 text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                    Screening only · Not diagnostic
                  </p>
                )}
              </div>

              <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
                <Button className="w-full" onClick={confirmSelection}>
                  Selecionar esta atividade
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={closePreview}
                >
                  Voltar para a lista
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-sm text-foreground">{value}</span>
    </div>
  );
}

function archetypeLabel(a: string): string {
  switch (a) {
    case "quiz_scale":
      return "Escala validada";
    case "drag_drop":
      return "Arrastar e soltar";
    case "structured_form":
      return "Formulário guiado";
    case "guided_timer":
      return "Exercício cronometrado";
    case "guided_script":
      return "Roteiro guiado";
    default:
      return a;
  }
}

function categoryLabel(c: string): string {
  const map: Record<string, string> = {
    anxiety: "Ansiedade",
    depression: "Depressão",
    cbt: "TCC",
    mindfulness: "Mindfulness",
    trauma: "Trauma",
    dbt: "DBT",
    act: "ACT",
    sleep: "Sono",
    crisis: "Crise",
  };
  return map[c] ?? c;
}

function modesLabel(modes: string[]): string {
  if (!modes.length) return "—";
  const labels: Record<string, string> = {
    in_session: "Em sessão",
    shared_link: "Por link",
    both: "Ambos",
  };
  return modes.map((m) => labels[m] ?? m).join(" · ");
}

// Suprime warning de import não-usado em modo padrão
void Link;
