/**
 * /h/$token — Public habit link route.
 *
 * Reusable link for mindfulness/habit activities.
 * Unlike /p/$token (single-use magic link), this link can be used
 * multiple times to record exercise completions.
 *
 * Flow:
 *  1. Validate token hash → find habit_link
 *  2. Check status + expiration
 *  3. Load activity config from catalog
 *  4. Render the breathing/guided runner
 *  5. On completion → submitHabitEntry() → show history
 */

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import { BreathingRunner } from "@/features/library/runners/breathing/BreathingRunner";
import type { BreathingConfig } from "@/features/library/runners/breathing/breathing-types";
import { submitHabitEntry, getHabitHistory } from "@/features/habits/habits.functions";
import { Check, BarChart3, Clock, Flame, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Server function: resolve token → activity data -----------------------

const resolveHabitToken = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const tokenHash = await hashMagicLinkToken(data.token);

    const { data: link, error } = await supabaseAdmin
      .from("habit_links")
      .select("id, workspace_id, patient_id, activity_id, status, expires_at, total_entries, last_entry_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !link) {
      return { error: "not_found" as const, activity: null, tokenHash: null, link: null };
    }

    if (link.status === "revoked") {
      return { error: "revoked" as const, activity: null, tokenHash: null, link: null };
    }

    if (new Date(link.expires_at) < new Date()) {
      await supabaseAdmin
        .from("habit_links")
        .update({ status: "expired" })
        .eq("id", link.id);
      return { error: "expired" as const, activity: null, tokenHash: null, link: null };
    }

    // Load activity
    const { data: activity } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, slug, title, archetype, config, short_description")
      .eq("id", link.activity_id)
      .maybeSingle();

    if (!activity) {
      return { error: "not_found" as const, activity: null, tokenHash: null, link: null };
    }

    return {
      error: null,
      activity: {
        id: activity.id,
        slug: activity.slug,
        title: activity.title,
        archetype: activity.archetype,
        config: activity.config as Record<string, unknown>,
        shortDescription: activity.short_description,
      },
      tokenHash,
      link: {
        id: link.id,
        totalEntries: link.total_entries ?? 0,
        lastEntryAt: link.last_entry_at,
        expiresAt: link.expires_at,
      },
    };
  });

// --- Route -----------------------------------------------------------------

export const Route = createFileRoute("/h/$token")({
  head: () => ({
    meta: [
      { title: "Exercício · Terapily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ params }) => {
    return resolveHabitToken({ data: { token: params.token } });
  },
  component: HabitLinkPage,
});

type ViewState = "exercise" | "completed" | "history";

function HabitLinkPage() {
  const loaderData = Route.useLoaderData();
  const { token } = Route.useParams();
  const [view, setView] = useState<ViewState>("exercise");
  const [submitting, setSubmitting] = useState(false);
  const [historyData, setHistoryData] = useState<{
    totalEntries: number;
    entries: Array<{
      id: string;
      completedAt: string;
      durationSeconds: number | null;
      cyclesCompleted: number | null;
    }>;
  } | null>(null);

  // Error states
  if (loaderData.error) {
    return <HabitErrorPage error={loaderData.error} />;
  }

  const { activity, tokenHash, link } = loaderData;
  if (!activity || !tokenHash || !link) {
    return <HabitErrorPage error="not_found" />;
  }

  const config = activity.config as Record<string, unknown>;
  const isBreathing = config?.runner === "breathing";

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const breathingConfig = config as unknown as BreathingConfig;
      const cycleDuration = breathingConfig.phases?.reduce((s, p) => s + p.durationSec, 0) ?? 0;
      const totalSeconds = cycleDuration * (breathingConfig.cycles ?? 1);

      await submitHabitEntry({
        data: {
          tokenHash,
          durationSeconds: totalSeconds,
          cyclesCompleted: breathingConfig.cycles ?? 1,
        },
      });

      // Load history after submitting
      const history = await getHabitHistory({ data: { tokenHash } });
      setHistoryData(history);
      setView("completed");
    } catch (e) {
      console.error("[HabitLink] submit failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = async () => {
    if (!historyData) {
      try {
        const history = await getHabitHistory({ data: { tokenHash } });
        setHistoryData(history);
      } catch (e) {
        console.error("[HabitLink] history load failed", e);
      }
    }
    setView("history");
  };

  if (view === "completed") {
    return (
      <CompletedView
        activityTitle={activity.title}
        totalEntries={historyData?.totalEntries ?? link.totalEntries + 1}
        onViewHistory={handleViewHistory}
        onRepeat={() => setView("exercise")}
      />
    );
  }

  if (view === "history") {
    return (
      <HistoryView
        activityTitle={activity.title}
        entries={historyData?.entries ?? []}
        totalEntries={historyData?.totalEntries ?? 0}
        onBack={() => setView("exercise")}
      />
    );
  }

  // Exercise view
  if (isBreathing) {
    return (
      <div className="min-h-screen flex flex-col">
        <BreathingRunner
          config={config as unknown as BreathingConfig}
          onSubmit={handleComplete}
          submitting={submitting}
          submitLabel="Registrar prática"
        />
        {link.totalEntries > 0 && (
          <button
            onClick={handleViewHistory}
            className="fixed bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-xl bg-white/60 backdrop-blur-sm px-3 py-2 text-xs font-medium text-[oklch(0.35_0.05_160)] shadow-sm hover:bg-white/80 transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {link.totalEntries} práticas
          </button>
        )}
      </div>
    );
  }

  // Fallback for non-breathing activities (guided_script, etc.)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.95_0.02_160)] to-[oklch(0.90_0.03_170)] px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl text-[oklch(0.30_0.05_160)] mb-3">
          {activity.title}
        </h1>
        <p className="text-sm text-[oklch(0.45_0.04_160)] mb-6">
          {activity.shortDescription}
        </p>
        <p className="text-xs text-[oklch(0.50_0.03_160)]">
          Player para este tipo de atividade será implementado em breve.
        </p>
      </div>
    </div>
  );
}

// --- Sub-views -------------------------------------------------------------

function CompletedView({
  activityTitle,
  totalEntries,
  onViewHistory,
  onRepeat,
}: {
  activityTitle: string;
  totalEntries: number;
  onViewHistory: () => void;
  onRepeat: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[oklch(0.95_0.02_160)] via-[oklch(0.93_0.03_170)] to-[oklch(0.90_0.04_180)] px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.72_0.08_160)] shadow-lg">
          <Check className="w-10 h-10 text-white" />
        </div>

        <div>
          <h1 className="font-display text-3xl text-[oklch(0.30_0.05_160)] mb-2">
            Prática registrada
          </h1>
          <p className="text-sm text-[oklch(0.45_0.04_160)]">
            {activityTitle}
          </p>
        </div>

        <div className="flex items-center gap-6 py-4">
          <div className="text-center">
            <p className="text-3xl font-mono font-light text-[oklch(0.35_0.06_160)]">
              {totalEntries}
            </p>
            <p className="text-xs text-[oklch(0.50_0.04_160)] mt-0.5">
              {totalEntries === 1 ? "prática" : "práticas"}
            </p>
          </div>
          <div className="h-8 w-px bg-[oklch(0.72_0.08_160/0.2)]" />
          <div className="text-center">
            <Flame className="w-6 h-6 mx-auto text-[oklch(0.65_0.10_50)]" />
            <p className="text-xs text-[oklch(0.50_0.04_160)] mt-0.5">
              Continue assim
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={onRepeat}
            className="w-full px-6 py-3 rounded-2xl text-sm font-medium bg-white/70 backdrop-blur-sm shadow-md hover:bg-white/90 transition-all text-[oklch(0.35_0.05_160)]"
          >
            Praticar novamente
          </button>
          <button
            onClick={onViewHistory}
            className="w-full px-6 py-3 rounded-2xl text-sm font-medium bg-white/30 backdrop-blur-sm hover:bg-white/50 transition-all text-[oklch(0.40_0.04_160)]"
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            Ver histórico
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryView({
  activityTitle,
  entries,
  totalEntries,
  onBack,
}: {
  activityTitle: string;
  entries: Array<{
    id: string;
    completedAt: string;
    durationSeconds: number | null;
    cyclesCompleted: number | null;
  }>;
  totalEntries: number;
  onBack: () => void;
}) {
  // Group entries by date
  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const date = new Date(entry.completedAt).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  // Calculate streaks
  const uniqueDays = new Set(
    entries.map((e) => new Date(e.completedAt).toISOString().slice(0, 10)),
  );
  const streak = calculateStreak(Array.from(uniqueDays).sort().reverse());

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.95_0.02_160)] to-[oklch(0.92_0.03_170)]">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[oklch(0.45_0.04_160)] hover:text-[oklch(0.30_0.05_160)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao exercício
        </button>
        <h1 className="font-display text-2xl text-[oklch(0.30_0.05_160)]">
          {activityTitle}
        </h1>
        <p className="text-sm text-[oklch(0.45_0.04_160)] mt-1">
          Seu histórico de práticas
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="flex gap-3">
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            value={totalEntries.toString()}
            label="Total"
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            value={`${streak}d`}
            label="Sequência"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            value={formatTotalMinutes(entries)}
            label="Tempo total"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 sm:px-6 pb-20">
        {Object.entries(grouped).map(([date, dayEntries]) => (
          <div key={date} className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[oklch(0.50_0.04_160)] mb-2">
              {date}
            </p>
            <div className="space-y-1.5">
              {dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl bg-white/50 backdrop-blur-sm px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[oklch(0.72_0.08_160)]" />
                    <span className="text-sm text-[oklch(0.35_0.05_160)]">
                      {new Date(entry.completedAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[oklch(0.50_0.04_160)]">
                    {entry.cyclesCompleted && (
                      <span>{entry.cyclesCompleted} ciclos</span>
                    )}
                    {entry.durationSeconds && (
                      <span>{Math.round(entry.durationSeconds / 60)}min</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-12 text-sm text-[oklch(0.50_0.04_160)]">
            Nenhuma prática registrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-white/50 backdrop-blur-sm px-3 py-3 text-center">
      <div className="flex items-center justify-center text-[oklch(0.55_0.06_160)] mb-1">
        {icon}
      </div>
      <p className="text-lg font-mono font-light text-[oklch(0.30_0.05_160)]">
        {value}
      </p>
      <p className="text-[0.6rem] text-[oklch(0.50_0.04_160)] uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function HabitErrorPage({ error }: { error: string }) {
  const messages: Record<string, { title: string; desc: string }> = {
    not_found: {
      title: "Link não encontrado",
      desc: "Este link pode ter sido removido ou o endereço está incorreto.",
    },
    revoked: {
      title: "Link desativado",
      desc: "Seu terapeuta desativou este link. Entre em contato para um novo.",
    },
    expired: {
      title: "Link expirado",
      desc: "Este link de prática expirou. Peça um novo ao seu terapeuta.",
    },
  };

  const msg = messages[error] ?? messages.not_found;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.95_0.02_160)] to-[oklch(0.90_0.03_170)] px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl text-[oklch(0.30_0.05_160)] mb-3">
          {msg.title}
        </h1>
        <p className="text-sm text-[oklch(0.45_0.04_160)]">{msg.desc}</p>
      </div>
    </div>
  );
}

// --- Helpers ---------------------------------------------------------------

function calculateStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;
  let streak = 1;
  const today = new Date().toISOString().slice(0, 10);
  // If latest practice isn't today or yesterday, streak is 0
  if (sortedDatesDesc[0] !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (sortedDatesDesc[0] !== yesterday) return 0;
  }
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const prev = new Date(sortedDatesDesc[i - 1]);
    const curr = new Date(sortedDatesDesc[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diffDays) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function formatTotalMinutes(
  entries: Array<{ durationSeconds: number | null }>,
): string {
  const totalSec = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const mins = Math.round(totalSec / 60);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h${remainMins}` : `${hours}h`;
}
