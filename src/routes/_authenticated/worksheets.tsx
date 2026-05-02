/**
 * /worksheets — All worksheets organized by clinical category.
 * Same visual pattern as /scales: header + grouped cards.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { listAvailableActivities } from "@/features/activities/activities.functions";
import { useAuth } from "@/features/auth/AuthProvider";
import { PatientPickerSheet } from "@/features/library/PatientPickerSheet";
import { ScaleCard, getScaleIllustration } from "@/features/library/ScaleCard";
import type { Activity as ActivityType } from "@/features/library/library.types";

export const Route = createFileRoute("/_authenticated/worksheets")({
  head: () => ({
    meta: [
      { title: "Worksheets · Terapily" },
      {
        name: "description",
        content: "Registros guiados e formulários terapêuticos estruturados.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WorksheetsPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  cbt: "TCC — Terapia Cognitivo-Comportamental",
  depression: "Depressão",
  anxiety: "Ansiedade",
  act: "ACT — Aceitação e Compromisso",
  wellbeing: "Bem-estar e Habilidades",
  trauma: "Trauma",
  sleep: "Sono",
};

const CATEGORY_ORDER = [
  "cbt", "depression", "anxiety", "act", "wellbeing", "trauma", "sleep",
];

type WorksheetRow = {
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

function WorksheetsPage() {
  const auth = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerActivity, setPickerActivity] = useState<ActivityType | null>(null);
  const [pickerMode, setPickerMode] = useState<"in_session" | "shared_link">("in_session");

  const catalogQuery = useQuery({
    queryKey: ["activity-catalog-worksheets", auth.workspace?.id ?? null],
    queryFn: () =>
      listAvailableActivities({
        data: { workspaceId: auth.workspace?.id },
      }),
    enabled: !auth.isLoading,
    staleTime: 60_000,
  });

  const allWorksheets = ((catalogQuery.data?.activities ?? []) as WorksheetRow[]).filter(
    (a) => a.archetype === "structured_form",
  );

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    items: allWorksheets.filter((w) => w.category === cat),
  })).filter((g) => g.items.length > 0);

  const toActivityType = (ws: WorksheetRow): ActivityType => {
    const cfg = ws.config ?? {};
    return {
      id: ws.id,
      code: (cfg.code as string) ?? ws.slug.toUpperCase(),
      name: ws.title,
      approach: "Worksheet",
      category: (ws.category as ActivityType["category"]) ?? "cbt",
      archetype: "structured_form",
      theme: (ws.theme === "sage_dark" ? "sage-dark" : ws.theme) as ActivityType["theme"],
      durationMin: (cfg.estimated_minutes as number) ?? 10,
      shortDescription: ws.short_description,
      illustration: getScaleIllustration(ws.category),
      supportedModes: (cfg.supported_modes as ActivityType["supportedModes"]) ?? ["in_session", "shared_link", "both"],
    };
  };

  const handleStartInSession = (ws: WorksheetRow) => {
    setPickerActivity(toActivityType(ws));
    setPickerMode("in_session");
    setPickerOpen(true);
  };

  const handleSendLink = (ws: WorksheetRow) => {
    setPickerActivity(toActivityType(ws));
    setPickerMode("shared_link");
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
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <Eyebrow>Acervo</Eyebrow>
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-[2.5rem]">
              Worksheets
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {allWorksheets.length} registros guiados e formulários terapêuticos.
          Aplique em sessão ou envie como atividade entre sessões.
        </p>
      </header>

      {catalogQuery.isLoading && (
        <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted-foreground sm:px-8">
          Carregando worksheets…
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-8">
        {grouped.map((group) => (
          <section key={group.category}>
            <h2 className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((ws) => {
                const cfg = ws.config ?? {};
                const isExclusive =
                  Array.isArray(cfg.supported_modes) &&
                  (cfg.supported_modes as string[]).length === 1 &&
                  (cfg.supported_modes as string[])[0] === "in_session";
                const duration = (cfg.estimated_minutes as number) ?? 10;
                const code = (cfg.code as string) ?? ws.slug.toUpperCase();
                const supportsMagicLink =
                  Array.isArray(cfg.supported_modes) &&
                  ((cfg.supported_modes as string[]).includes("shared_link") ||
                   (cfg.supported_modes as string[]).includes("both"));

                return (
                  <ScaleCard
                    key={ws.id}
                    code={code}
                    name={ws.title}
                    category={ws.category}
                    durationMin={duration}
                    shortDescription={ws.short_description}
                    illustration={getScaleIllustration(ws.category)}
                    isExclusive={isExclusive}
                    supportsMagicLink={supportsMagicLink}
                    onClick={() => handleStartInSession(ws)}
                    onSendLink={() => handleSendLink(ws)}
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
        mode={pickerMode}
      />
    </div>
  );
}
