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

import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import { BreathingRunner } from "@/features/library/runners/breathing/BreathingRunner";
import type { BreathingConfig } from "@/features/library/runners/breathing/breathing-types";
import { submitHabitEntry, getHabitHistory } from "@/features/habits/habits.functions";
import { Check, BarChart3, Clock, Flame, ArrowLeft, Calendar, TrendingUp } from "lucide-react";

// --- Server function: resolve token → activity data -----------------------

const resolveHabitToken = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{
    error: string | null;
    activity: {
      id: string;
      slug: string;
      title: string;
      archetype: string;
      config: Record<string, {}>;
      shortDescription: string;
    } | null;
    tokenHash: string | null;
    link: {
      id: string;
      totalEntries: number;
      lastEntryAt: string | null;
      expiresAt: string;
      consentAccepted: boolean;
    } | null;
  }> => {
    const tokenHash = await hashMagicLinkToken(data.token);

    const { data: link, error } = await supabaseAdmin
      .from("habit_links")
      .select("id, workspace_id, patient_id, activity_id, status, expires_at, total_entries, last_entry_at, consent_accepted_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !link) {
      return { error: "not_found", activity: null, tokenHash: null, link: null };
    }

    if (link.status === "revoked") {
      return { error: "revoked", activity: null, tokenHash: null, link: null };
    }

    if (new Date(link.expires_at) < new Date()) {
      await supabaseAdmin
        .from("habit_links")
        .update({ status: "expired" })
        .eq("id", link.id);
      return { error: "expired", activity: null, tokenHash: null, link: null };
    }

    // Load activity
    const { data: activity } = await supabaseAdmin
      .from("activity_catalog")
      .select("id, slug, title, archetype, config, short_description")
      .eq("id", link.activity_id)
      .maybeSingle();

    if (!activity) {
      return { error: "not_found", activity: null, tokenHash: null, link: null };
    }

    return {
      error: null,
      activity: {
        id: activity.id,
        slug: activity.slug,
        title: activity.title,
        archetype: activity.archetype as string,
        config: activity.config as Record<string, {}>,
        shortDescription: activity.short_description,
      },
      tokenHash,
      link: {
        id: link.id,
        totalEntries: link.total_entries ?? 0,
        lastEntryAt: link.last_entry_at,
        expiresAt: link.expires_at,
        consentAccepted: !!link.consent_accepted_at,
      },
    };
  });

// --- Server function: accept consent for a habit link ----------------------

const acceptHabitConsent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ tokenHash: z.string().min(1).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: link } = await supabaseAdmin
      .from("habit_links")
      .select("id, status, expires_at, consent_accepted_at")
      .eq("token_hash", data.tokenHash)
      .maybeSingle();

    if (!link) throw new Error("Link não encontrado.");
    if (link.status !== "active") throw new Error("Link inativo.");
    if (new Date(link.expires_at) < new Date()) throw new Error("Link expirado.");

    // Already accepted — idempotent
    if (link.consent_accepted_at) return { ok: true };

    await supabaseAdmin
      .from("habit_links")
      .update({
        consent_accepted_at: new Date().toISOString(),
      })
      .eq("id", link.id);

    return { ok: true };
  });

// --- Route -----------------------------------------------------------------

function HabitRouteError({ error }: { error: Error }) {
  return <HabitErrorPage error="not_found" />;
}

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
  errorComponent: HabitRouteError,
});

type ViewState = "consent" | "exercise" | "completed" | "history";

interface HistoryEntry {
  id: string;
  completedAt: string;
  durationSeconds: number | null;
  cyclesCompleted: number | null;
}

function HabitLinkPage() {
  const loaderData = Route.useLoaderData();
  const [view, setView] = useState<ViewState>(() => {
    // CRITICAL: If consent not accepted, ALWAYS start at consent screen
    if (loaderData.link && !loaderData.link.consentAccepted) return "consent";
    return "exercise";
  });
  const [submitting, setSubmitting] = useState(false);
  const [acceptingConsent, setAcceptingConsent] = useState(false);
  const [historyData, setHistoryData] = useState<{
    totalEntries: number;
    entries: HistoryEntry[];
  } | null>(null);

  // Error states
  if (loaderData.error) {
    return <HabitErrorPage error={loaderData.error} />;
  }

  const { activity, tokenHash, link } = loaderData;
  if (!activity || !tokenHash || !link) {
    return <HabitErrorPage error="not_found" />;
  }

  // CRITICAL SECURITY GATE: Block exercise if consent not accepted
  const consentGiven = link.consentAccepted || view !== "consent";

  const handleAcceptConsent = async () => {
    setAcceptingConsent(true);
    try {
      await acceptHabitConsent({ data: { tokenHash } });
      setView("exercise");
    } catch (e) {
      console.error("[HabitLink] consent accept failed", e);
    } finally {
      setAcceptingConsent(false);
    }
  };

  const handleDeclineConsent = () => {
    // Declined → show blocked page, cannot proceed
    setView("consent");
  };

  // Consent screen — MUST show before any exercise
  if (view === "consent") {
    return (
      <ConsentScreen
        activityTitle={activity.title}
        onAccept={handleAcceptConsent}
        accepting={acceptingConsent}
      />
    );
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
        entries={historyData?.entries ?? []}
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
        expiresAt={link.expiresAt}
        onBack={() => setView("exercise")}
      />
    );
  }

  // Exercise view
  if (isBreathing) {
    return (
      <>
        <BreathingRunner
          config={config as unknown as BreathingConfig}
          onSubmit={handleComplete}
          submitting={submitting}
          submitLabel="Registrar prática"
        />
        {link.totalEntries > 0 && (
          <button
            onClick={handleViewHistory}
            className="fixed bottom-20 right-4 z-30 flex items-center gap-1.5 rounded-xl bg-white/60 backdrop-blur-sm px-3 py-2 text-xs font-medium text-[oklch(0.35_0.05_160)] shadow-sm hover:bg-white/80 transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {link.totalEntries} práticas
          </button>
        )}
      </>
    );
  }

  // Fallback for non-breathing activities
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

// --- Completed View --------------------------------------------------------

function CompletedView({
  activityTitle,
  totalEntries,
  entries,
  onViewHistory,
  onRepeat,
}: {
  activityTitle: string;
  totalEntries: number;
  entries: HistoryEntry[];
  onViewHistory: () => void;
  onRepeat: () => void;
}) {
  const streak = useMemo(() => {
    const uniqueDays = [...new Set(entries.map((e) => new Date(e.completedAt).toISOString().slice(0, 10)))].sort().reverse();
    return calculateStreak(uniqueDays);
  }, [entries]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[oklch(0.95_0.02_160)] via-[oklch(0.93_0.03_170)] to-[oklch(0.90_0.04_180)] px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
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
            <p className="text-3xl font-mono font-light text-[oklch(0.65_0.10_50)]">
              {streak}
            </p>
            <p className="text-xs text-[oklch(0.50_0.04_160)] mt-0.5">
              {streak === 1 ? "dia seguido" : "dias seguidos"}
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

// --- History View ----------------------------------------------------------

type PeriodFilter = "7d" | "30d" | "all";

function HistoryView({
  activityTitle,
  entries,
  totalEntries,
  expiresAt,
  onBack,
}: {
  activityTitle: string;
  entries: HistoryEntry[];
  totalEntries: number;
  expiresAt: string;
  onBack: () => void;
}) {
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  const filteredEntries = useMemo(() => {
    if (period === "all") return entries;
    const days = period === "7d" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    return entries.filter((e) => new Date(e.completedAt) >= cutoff);
  }, [entries, period]);

  const uniqueDays = useMemo(() => {
    const set = new Set(filteredEntries.map((e) => new Date(e.completedAt).toISOString().slice(0, 10)));
    return Array.from(set).sort().reverse();
  }, [filteredEntries]);

  const streak = useMemo(() => {
    const allDays = [...new Set(entries.map((e) => new Date(e.completedAt).toISOString().slice(0, 10)))].sort().reverse();
    return calculateStreak(allDays);
  }, [entries]);

  const longestStreak = useMemo(() => {
    const allDays = [...new Set(entries.map((e) => new Date(e.completedAt).toISOString().slice(0, 10)))].sort();
    if (allDays.length === 0) return 0;
    let longest = 1;
    let current = 1;
    for (let i = 1; i < allDays.length; i++) {
      const diff = (new Date(allDays[i]).getTime() - new Date(allDays[i - 1]).getTime()) / 86400000;
      if (Math.round(diff) === 1) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }
    return longest;
  }, [entries]);

  const totalMinutes = useMemo(
    () => Math.round(filteredEntries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / 60),
    [filteredEntries],
  );

  const adherencePercent = useMemo(() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : (() => {
      if (entries.length === 0) return 1;
      const first = new Date(entries[entries.length - 1].completedAt);
      return Math.max(1, Math.ceil((Date.now() - first.getTime()) / 86400000));
    })();
    return Math.min(100, Math.round((uniqueDays.length / days) * 100));
  }, [uniqueDays, entries, period]);

  // Group entries by date for timeline
  const grouped = useMemo(() => {
    return filteredEntries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
      const date = new Date(entry.completedAt).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    }, {});
  }, [filteredEntries]);

  const daysUntilExpiry = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));

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
        <h1 className="font-display text-2xl sm:text-3xl text-[oklch(0.30_0.05_160)]">
          {activityTitle}
        </h1>
        <p className="text-sm text-[oklch(0.45_0.04_160)] mt-1">
          Seu histórico de práticas
        </p>
      </div>

      {/* Period filter */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="flex gap-2">
          {(["7d", "30d", "all"] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p
                  ? "bg-[oklch(0.72_0.08_160)] text-white shadow-sm"
                  : "bg-white/40 text-[oklch(0.45_0.04_160)] hover:bg-white/60"
              }`}
            >
              {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "Tudo"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            value={filteredEntries.length.toString()}
            label="Práticas"
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            value={`${streak}`}
            label="Sequência atual"
            accent={streak >= 3}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            value={`${adherencePercent}%`}
            label="Aderência"
            accent={adherencePercent >= 70}
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            value={totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(1)}h` : `${totalMinutes}min`}
            label="Tempo total"
          />
        </div>
      </div>

      {/* Streak + adherence details */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="rounded-xl bg-white/50 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[oklch(0.50_0.04_160)]">
              Progresso
            </p>
            <div className="flex items-center gap-1 text-[0.6rem] text-[oklch(0.55_0.04_160)]">
              <Calendar className="w-3 h-3" />
              {daysUntilExpiry > 0 ? `${daysUntilExpiry}d restantes` : "Expirando"}
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-[oklch(0.50_0.04_160)]">Sequência atual</p>
              <p className="text-2xl font-mono font-light text-[oklch(0.30_0.05_160)]">
                {streak} <span className="text-sm">dias</span>
              </p>
            </div>
            <div className="h-10 w-px bg-[oklch(0.85_0.03_160)]" />
            <div>
              <p className="text-xs text-[oklch(0.50_0.04_160)]">Maior sequência</p>
              <p className="text-2xl font-mono font-light text-[oklch(0.30_0.05_160)]">
                {longestStreak} <span className="text-sm">dias</span>
              </p>
            </div>
            <div className="h-10 w-px bg-[oklch(0.85_0.03_160)]" />
            <div>
              <p className="text-xs text-[oklch(0.50_0.04_160)]">Dias ativos</p>
              <p className="text-2xl font-mono font-light text-[oklch(0.30_0.05_160)]">
                {uniqueDays.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap (7 weeks) */}
      {entries.length > 0 && (
        <div className="px-4 sm:px-6 pb-4">
          <HabitHeatmap entries={entries} />
        </div>
      )}

      {/* Timeline */}
      <div className="px-4 sm:px-6 pb-20">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[oklch(0.50_0.04_160)] mb-3">
          Histórico
        </p>
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
                    {entry.cyclesCompleted != null && entry.cyclesCompleted > 0 && (
                      <span>{entry.cyclesCompleted} ciclos</span>
                    )}
                    {entry.durationSeconds != null && entry.durationSeconds > 0 && (
                      <span>{Math.round(entry.durationSeconds / 60)}min</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-sm text-[oklch(0.50_0.04_160)]">
            Nenhuma prática neste período.
          </div>
        )}
      </div>
    </div>
  );
}

// --- Heatmap (7 weeks) -----------------------------------------------------

function HabitHeatmap({ entries }: { entries: HistoryEntry[] }) {
  const { weeks, weekDayLabels } = useMemo(() => {
    const countByDay: Record<string, number> = {};
    for (const e of entries) {
      const d = new Date(e.completedAt).toISOString().slice(0, 10);
      countByDay[d] = (countByDay[d] ?? 0) + 1;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun
    const totalDays = 7 * 7; // 7 weeks
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + (6 - dayOfWeek) + 1);

    const weeksArr: Array<Array<{ date: string; count: number; isToday: boolean; isFuture: boolean }>> = [];
    let currentWeek: typeof weeksArr[0] = [];

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const todayKey = today.toISOString().slice(0, 10);
      currentWeek.push({
        date: key,
        count: countByDay[key] ?? 0,
        isToday: key === todayKey,
        isFuture: d > today,
      });
      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) weeksArr.push(currentWeek);

    return {
      weeks: weeksArr,
      weekDayLabels: ["D", "S", "T", "Q", "Q", "S", "S"],
    };
  }, [entries]);

  const getColor = (count: number, isFuture: boolean) => {
    if (isFuture) return "bg-[oklch(0.92_0.01_160/0.3)]";
    if (count === 0) return "bg-[oklch(0.92_0.02_160)]";
    if (count === 1) return "bg-[oklch(0.78_0.06_160)]";
    if (count === 2) return "bg-[oklch(0.65_0.08_160)]";
    return "bg-[oklch(0.52_0.10_160)]";
  };

  return (
    <div className="rounded-xl bg-white/50 backdrop-blur-sm p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[oklch(0.50_0.04_160)] mb-3">
        Últimas 7 semanas
      </p>
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {weekDayLabels.map((label, i) => (
            <div key={i} className="h-3 w-3 sm:h-4 sm:w-4 flex items-center justify-center text-[0.5rem] text-[oklch(0.55_0.04_160)]">
              {i % 2 === 1 ? label : ""}
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`h-3 w-3 sm:h-4 sm:w-4 rounded-[3px] transition-colors ${getColor(day.count, day.isFuture)} ${day.isToday ? "ring-1 ring-[oklch(0.72_0.08_160)]" : ""}`}
                title={`${day.date}: ${day.count} prática${day.count !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[0.5rem] text-[oklch(0.55_0.04_160)]">Menos</span>
        <div className="h-2.5 w-2.5 rounded-[2px] bg-[oklch(0.92_0.02_160)]" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-[oklch(0.78_0.06_160)]" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-[oklch(0.65_0.08_160)]" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-[oklch(0.52_0.10_160)]" />
        <span className="text-[0.5rem] text-[oklch(0.55_0.04_160)]">Mais</span>
      </div>
    </div>
  );
}

// --- Sub-components --------------------------------------------------------

function StatCard({
  icon,
  value,
  label,
  accent = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/50 backdrop-blur-sm px-3 py-3 text-center">
      <div className={`flex items-center justify-center mb-1 ${accent ? "text-[oklch(0.65_0.10_50)]" : "text-[oklch(0.55_0.06_160)]"}`}>
        {icon}
      </div>
      <p className={`text-lg font-mono font-light ${accent ? "text-[oklch(0.50_0.10_50)]" : "text-[oklch(0.30_0.05_160)]"}`}>
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
