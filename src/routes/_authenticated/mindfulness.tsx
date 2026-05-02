/**
 * /mindfulness — All mindfulness & grounding activities.
 * Organized by subcategory: Respiração, Ancoragem, Relaxamento, Atenção.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Wind } from "lucide-react";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { useAuth } from "@/features/auth/AuthProvider";
import { PatientPickerSheet } from "@/features/library/PatientPickerSheet";
import { ScaleCard, getScaleIllustration } from "@/features/library/ScaleCard";
import type { Activity as ActivityType } from "@/features/library/library.types";
import { ACTIVITIES } from "@/features/library/seed-data";

export const Route = createFileRoute("/_authenticated/mindfulness")({
  head: () => ({
    meta: [
      { title: "Mindfulness & Grounding · Terapily" },
      {
        name: "description",
        content:
          "Exercícios guiados de respiração, ancoragem e relaxamento baseados em evidências.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MindfulnessPage,
});

const SUBCATEGORY_CONFIG: Array<{
  key: string;
  label: string;
  description: string;
}> = [
  {
    key: "breathing",
    label: "Respiração",
    description: "Técnicas de respiração controlada para ativar o sistema parassimpático.",
  },
  {
    key: "body-scan",
    label: "Body Scan & Consciência Corporal",
    description: "Varredura progressiva do corpo com atenção plena. Protocolos MBSR.",
  },
  {
    key: "relaxation",
    label: "Relaxamento Muscular",
    description: "Relaxamento muscular progressivo (PMR) baseado em Jacobson.",
  },
  {
    key: "grounding",
    label: "Ancoragem & Estabilização",
    description: "Exercícios sensoriais para voltar ao presente e regular emoções.",
  },
  {
    key: "meditation",
    label: "Meditação & Atenção Plena",
    description: "Práticas de atenção sustentada e compaixão baseadas em MBCT e CFT.",
  },
  {
    key: "attention",
    label: "Atenção Focada",
    description: "Exercícios de observação intencional para treinar a concentração gentil.",
  },
  {
    key: "informal",
    label: "Mindfulness Informal",
    description: "Práticas integradas ao cotidiano: comer, caminhar e atividades diárias com atenção.",
  },
  {
    key: "defusion",
    label: "Defusão Cognitiva",
    description: "Técnicas ACT e mindfulness para se distanciar de pensamentos difíceis.",
  },
  {
    key: "micro-practices",
    label: "Micro-Práticas",
    description: "Exercícios rápidos (≤3 min) para homework e momentos de crise leve.",
  },
  {
    key: "self-compassion",
    label: "Autocompaixão",
    description: "Práticas de compaixão focada baseadas em CFT e Mindful Self-Compassion.",
  },
];

function MindfulnessPage() {
  const auth = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerActivity, setPickerActivity] = useState<ActivityType | null>(null);
  const [pickerMode, setPickerMode] = useState<"in_session" | "shared_link">("in_session");

  const mindfulnessActivities = ACTIVITIES.filter(
    (a) => a.category === "mindfulness",
  );

  const handleStart = (activity: ActivityType, mode: "in_session" | "shared_link") => {
    setPickerActivity(activity);
    setPickerMode(mode);
    setPickerOpen(true);
  };

  // Group by subcategory
  const grouped = SUBCATEGORY_CONFIG.map((sub) => ({
    ...sub,
    activities: mindfulnessActivities.filter((a) => a.subcategory === sub.key),
  })).filter((g) => g.activities.length > 0);

  // Activities without subcategory go into a catch-all
  const uncategorized = mindfulnessActivities.filter((a) => !a.subcategory);

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-8 sm:pt-12">
        <Link
          to="/library"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Acervo
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/15 text-sage">
            <Wind className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <Eyebrow>Mindfulness & Grounding</Eyebrow>
            <h1 className="mt-1 font-display text-3xl leading-tight text-foreground sm:text-[2.5rem]">
              Exercícios guiados
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Respiração, ancoragem sensorial e relaxamento muscular — baseados em
          protocolos clínicos (MBSR, DBT, PMR). Aplique ao vivo ou envie como
          prática entre sessões.
        </p>
      </header>

      {/* Grouped sections */}
      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-8">
        {grouped.map((group) => (
          <section key={group.key}>
            <div className="mb-4">
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                {group.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.activities.map((activity) => (
                <ScaleCard
                  key={activity.id}
                  code={activity.code}
                  name={activity.name}
                  category={activity.category}
                  durationMin={activity.durationMin}
                  shortDescription={activity.shortDescription}
                  illustration={getScaleIllustration(activity.illustration)}
                  chipLabel={group.label}
                  supportsMagicLink={
                    activity.supportedModes.includes("shared_link") ||
                    activity.supportedModes.includes("both")
                  }
                  onClick={() => handleStart(activity, "in_session")}
                  onSendLink={() => handleStart(activity, "shared_link")}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Uncategorized fallback */}
        {uncategorized.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-xl text-foreground sm:text-2xl">
              Outras práticas
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uncategorized.map((activity) => (
                <ScaleCard
                  key={activity.id}
                  code={activity.code}
                  name={activity.name}
                  category={activity.category}
                  durationMin={activity.durationMin}
                  shortDescription={activity.shortDescription}
                  illustration={getScaleIllustration(activity.illustration)}
                  chipLabel="Mindfulness"
                  supportsMagicLink={
                    activity.supportedModes.includes("shared_link") ||
                    activity.supportedModes.includes("both")
                  }
                  onClick={() => handleStart(activity, "in_session")}
                  onSendLink={() => handleStart(activity, "shared_link")}
                />
              ))}
            </div>
          </section>
        )}

        {mindfulnessActivities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-muted-foreground">
              Nenhuma atividade de mindfulness disponível ainda.
            </p>
          </div>
        )}
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
