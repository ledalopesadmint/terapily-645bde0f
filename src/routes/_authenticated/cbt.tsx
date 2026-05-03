/**
 * /cbt — CBT Essentials — all CBT activities.
 * Includes drag_drop (distorções, hierarquia) and structured_form (thought record, evidence).
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Brain } from "lucide-react";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { useAuth } from "@/features/auth/AuthProvider";
import { PatientPickerSheet } from "@/features/library/PatientPickerSheet";
import { ScaleCard, getScaleIllustration } from "@/features/library/ScaleCard";
import type { Activity as ActivityType } from "@/features/library/library.types";
import { ACTIVITIES } from "@/features/library/seed-data";

export const Route = createFileRoute("/_authenticated/cbt")({
  head: () => ({
    meta: [
      { title: "CBT Essentials · Terapily" },
      {
        name: "description",
        content:
          "Ferramentas essenciais de Terapia Cognitivo-Comportamental — reestruturação cognitiva, distorções, evidências.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CbtPage,
});

function CbtPage() {
  const auth = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerActivity, setPickerActivity] = useState<ActivityType | null>(null);
  const [pickerMode, setPickerMode] = useState<"in_session" | "shared_link">("in_session");

  const cbtActivities = ACTIVITIES.filter(
    (a) => a.category === "cbt",
  );

  const handleStart = (activity: ActivityType, mode: "in_session" | "shared_link") => {
    setPickerActivity(activity);
    setPickerMode(mode);
    setPickerOpen(true);
  };

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--navy)] text-cream">
            <Brain className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <Eyebrow>CBT Essentials</Eyebrow>
            <h1 className="mt-1 font-display text-3xl leading-tight text-foreground sm:text-[2.5rem]">
              Reestruturação cognitiva
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Ferramentas essenciais de TCC — identifique distorções cognitivas,
          examine evidências e reestruture pensamentos. Baseado em Beck e Burns.
        </p>
      </header>

      {/* Activity cards */}
      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-8">
        {cbtActivities.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cbtActivities.map((activity) => (
              <ScaleCard
                key={activity.id}
                code={activity.code}
                name={activity.name}
                category={activity.category}
                durationMin={activity.durationMin}
                shortDescription={activity.shortDescription}
                illustration={getScaleIllustration(activity.illustration)}
                chipLabel="CBT"
                supportsMagicLink={
                  activity.supportedModes.includes("shared_link") ||
                  activity.supportedModes.includes("both")
                }
                onClick={() => handleStart(activity, "in_session")}
                onSendLink={() => handleStart(activity, "shared_link")}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-muted-foreground">
              Nenhuma atividade CBT disponível ainda.
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
