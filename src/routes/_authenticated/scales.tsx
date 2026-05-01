/**
 * /scales — Página dedicada com todas as 33 escalas validadas.
 * Busca do banco via listAvailableActivities, filtra archetype=quiz_scale.
 * Cards editoriais com ilustração SVG, mesma estética do Acervo.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Activity } from "lucide-react";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { listAvailableActivities } from "@/features/activities/activities.functions";
import { useAuth } from "@/features/auth/AuthProvider";
import { PatientPickerSheet } from "@/features/library/PatientPickerSheet";
import { ScaleCard, getScaleIllustration } from "@/features/library/ScaleCard";
import type { Activity as ActivityType } from "@/features/library/library.types";

export const Route = createFileRoute("/_authenticated/scales")({
  head: () => ({
    meta: [
      { title: "Escalas validadas · Terapily" },
      {
        name: "description",
        content: "33 escalas clínicas validadas com score automático.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ScalesPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  depression: "Depression",
  anxiety: "Anxiety",
  trauma: "Trauma & Adversity",
  substance_use: "Substance Use",
  ocd: "OCD",
  eating: "Eating",
  sleep: "Sleep",
  wellbeing: "Well-being & Functioning",
  cbt: "CBT",
  act: "ACT",
};

const CATEGORY_ORDER = [
  "depression", "anxiety", "trauma", "substance_use",
  "ocd", "eating", "sleep", "wellbeing", "cbt", "act",
];

type ScaleRow = {
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

function ScalesPage() {
  const auth = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerActivity, setPickerActivity] = useState<ActivityType | null>(null);

  const catalogQuery = useQuery({
    queryKey: ["activity-catalog-scales", auth.workspace?.id ?? null],
    queryFn: () =>
      listAvailableActivities({
        data: { workspaceId: auth.workspace?.id },
      }),
    enabled: !auth.isLoading,
    staleTime: 60_000,
  });

  const allScales = ((catalogQuery.data?.activities ?? []) as ScaleRow[]).filter(
    (a) => a.archetype === "quiz_scale",
  );

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    scales: allScales.filter((s) => s.category === cat),
  })).filter((g) => g.scales.length > 0);

  const handleStartInSession = (scale: ScaleRow) => {
    const cfg = scale.config ?? {};
    const activity: ActivityType = {
      id: scale.id,
      code: (cfg.code as string) ?? scale.slug.toUpperCase(),
      name: scale.title,
      approach: "Escala validada",
      category: (scale.category as ActivityType["category"]) ?? "anxiety",
      archetype: "quiz_scale",
      theme: (scale.theme === "sage_dark" ? "sage-dark" : scale.theme) as ActivityType["theme"],
      durationMin: (cfg.estimated_minutes as number) ?? 5,
      shortDescription: scale.short_description,
      illustration: getScaleIllustration(scale.category),
      supportedModes: (cfg.supported_modes as ActivityType["supportedModes"]) ?? ["in_session"],
    };
    setPickerActivity(activity);
    setPickerOpen(true);
  };

  return (
    <div className="pb-20">
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-8 sm:pt-12">
        <Link
          to="/library"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Acervo
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--navy)] text-cream">
            <Activity className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <Eyebrow>Acervo</Eyebrow>
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-[2.5rem]">
              Escalas validadas
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {allScales.length} escalas clínicas com score automático. Selecione,
          escolha o paciente e comece — o player carrega só quando você aplicar.
        </p>
      </header>

      {catalogQuery.isLoading && (
        <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted-foreground sm:px-8">
          Carregando escalas…
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-8">
        {grouped.map((group) => (
          <section key={group.category}>
            <h2 className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.scales.map((scale) => {
                const cfg = scale.config ?? {};
                const isExclusive =
                  Array.isArray(cfg.supported_modes) &&
                  (cfg.supported_modes as string[]).length === 1 &&
                  (cfg.supported_modes as string[])[0] === "in_session";
                const duration = (cfg.estimated_minutes as number) ?? 5;
                const code = (cfg.code as string) ?? scale.slug.toUpperCase();

                return (
                  <ScaleCard
                    key={scale.id}
                    code={code}
                    name={scale.title}
                    category={scale.category}
                    durationMin={duration}
                    shortDescription={scale.short_description}
                    illustration={getScaleIllustration(scale.category)}
                    isExclusive={isExclusive}
                    onClick={() => handleStartInSession(scale)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <PatientPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activity={pickerActivity}
        workspaceId={auth.workspace?.id}
      />
    </div>
  );
}
