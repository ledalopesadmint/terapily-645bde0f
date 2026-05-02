/**
 * Habit Progress Report — server-only PDF generation.
 *
 * Two variants:
 *  - PATIENT ("Mindfulness Practice Summary"): motivational, streak-focused, practice highlights
 *  - THERAPIST ("Mindfulness Adherence Report"): analytical, patterns, gaps, trend, all entries
 *
 * Level 1 enhancements (approved):
 *  - Practice Highlights (patient): factual phrases celebrating consistency
 *  - Best Pattern: text below heatmap identifying best day/time
 *  - Timeline with events: milestone icons, gap markers, longest sessions
 *  - Numeric Trend (therapist): week-over-week % comparison
 *  - Consistency Index (both): 0-100 score with disclaimer
 *
 * Brand rules: identical to Scale Result / Compliance Report template (Navy header 18mm,
 * watermark 4.5%, footer with dynamic pagination, checkPage before fixed blocks).
 */

import { jsPDF } from "jspdf";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ICON_PNG_B64, WATERMARK_PNG_B64 } from "@/features/activities/pdf-brand-assets.server";

// ── Brand colors (RGB) ──
const NAVY: [number, number, number] = [31, 42, 54];
const CREAM: [number, number, number] = [244, 239, 230];
const SAGE: [number, number, number] = [126, 155, 134];
const CHARCOAL: [number, number, number] = [58, 63, 71];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [192, 57, 43];
const MAUVE: [number, number, number] = [184, 155, 163];

// Accent palette for stats cards
const CARD_COLORS = {
  sage:     { bg: [237, 245, 239] as [number, number, number], accent: SAGE },
  mauve:    { bg: [245, 237, 241] as [number, number, number], accent: MAUVE },
  cream:    { bg: [247, 245, 240] as [number, number, number], accent: NAVY },
  teal:     { bg: [230, 245, 243] as [number, number, number], accent: [56, 142, 131] as [number, number, number] },
  amber:    { bg: [255, 248, 225] as [number, number, number], accent: [180, 130, 50] as [number, number, number] },
};

// Heatmap intensity palette (5 levels)
const HEATMAP_LEVELS: [number, number, number][] = [
  [235, 233, 228],   // 0 = empty
  [200, 220, 201],   // 1 = low
  [126, 155, 134],   // 2 = medium (Sage)
  [90, 124, 99],     // 3 = high
  [58, 92, 67],      // 4 = very high
];

const M = 18; // margin
const PAGE_W = 210;
const PAGE_H = 297;
const CW = PAGE_W - M * 2;
const FOOTER_ZONE = PAGE_H - 22;
const BAR_H = 18; // header bar height
const CONTENT_GAP = 9;

// Milestone thresholds
const MILESTONES = [7, 14, 21, 30, 60];

type Variant = "patient" | "therapist";

interface HabitEntry {
  id: string;
  completed_at: string;
  duration_seconds: number | null;
  cycles_completed: number | null;
}

export interface HabitReportParams {
  habitLinkId: string;
  workspaceId: string;
  patientId: string;
}

// ── Main builder ──
export async function buildHabitReportPDF(
  params: HabitReportParams,
  variant: Variant,
  therapistInfo?: { name: string; practice: string; license: string; npi: string },
): Promise<number[]> {
  const { habitLinkId, workspaceId, patientId } = params;

  // Fetch data
  const [linkRes, patientRes, entriesRes] = await Promise.all([
    supabaseAdmin
      .from("habit_links")
      .select("id, activity_id, total_entries, last_entry_at, created_at, expires_at, status")
      .eq("id", habitLinkId)
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabaseAdmin
      .from("patients")
      .select("display_name, initials")
      .eq("id", patientId)
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabaseAdmin
      .from("habit_entries")
      .select("id, completed_at, duration_seconds, cycles_completed")
      .eq("habit_link_id", habitLinkId)
      .eq("workspace_id", workspaceId)
      .order("completed_at", { ascending: false })
      .limit(1000),
  ]);

  const link = linkRes.data;
  if (!link) throw new Error("Link não encontrado.");

  const activityRes = await supabaseAdmin
    .from("activity_catalog")
    .select("title, slug")
    .eq("id", link.activity_id)
    .maybeSingle();

  const entries: HabitEntry[] = entriesRes.data ?? [];
  const activityTitle = activityRes.data?.title ?? "Atividade";
  const patientName = patientRes.data?.display_name ?? "Participante";

  // ── Calculations ──
  const uniqueDays = [...new Set(
    entries.map((e) => new Date(e.completed_at).toISOString().slice(0, 10)),
  )].sort();

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0) / 60;
  const totalCycles = entries.reduce((s, e) => s + (e.cycles_completed ?? 0), 0);
  const currentStreak = calcStreak(uniqueDays.slice().reverse());
  const longestStreak = calcLongestStreak(uniqueDays);

  let adherencePercent = 0;
  if (uniqueDays.length >= 2) {
    const first = new Date(uniqueDays[0]);
    const last = new Date(uniqueDays[uniqueDays.length - 1]);
    const range = Math.max(1, Math.round((last.getTime() - first.getTime()) / 86400000) + 1);
    adherencePercent = Math.round((uniqueDays.length / range) * 100);
  } else if (uniqueDays.length === 1) {
    adherencePercent = 100;
  }

  // Daily counts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const countByDay: Record<string, number> = {};
  for (const e of entries) {
    const d = new Date(e.completed_at).toISOString().slice(0, 10);
    countByDay[d] = (countByDay[d] ?? 0) + 1;
  }

  // Day of week and period analysis (used by both variants now)
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  const periodCounts = { morning: 0, afternoon: 0, evening: 0 };
  let minDur = Infinity, maxDur = 0;
  for (const e of entries) {
    const d = new Date(e.completed_at);
    dowCounts[d.getDay()]++;
    const hour = d.getHours();
    if (hour < 12) periodCounts.morning++;
    else if (hour < 18) periodCounts.afternoon++;
    else periodCounts.evening++;
    if (e.duration_seconds != null) {
      if (e.duration_seconds < minDur) minDur = e.duration_seconds;
      if (e.duration_seconds > maxDur) maxDur = e.duration_seconds;
    }
  }

  // Best day & best period
  const dowLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bestDowIdx = dowCounts.indexOf(Math.max(...dowCounts));
  const bestDow = dowLabels[bestDowIdx];
  const periodLabelsMap = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
  const bestPeriod = Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0];

  // Consistency Index (0-100)
  const consistencyIndex = calcConsistencyIndex(uniqueDays, entries.length);

  // Weekly trend (last 2 weeks comparison)
  const thisWeekCount = countEntriesInRange(entries, 0, 7, today);
  const lastWeekCount = countEntriesInRange(entries, 7, 14, today);
  const trendPercent = lastWeekCount === 0 ? (thisWeekCount > 0 ? 100 : 0) : Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
  const trendArrow = trendPercent > 0 ? "↑" : trendPercent < 0 ? "↓" : "→";

  // Gaps calculation (reused in both variants)
  const gaps: { start: string; end: string; days: number }[] = [];
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff > 3) {
      gaps.push({ start: uniqueDays[i - 1], end: uniqueDays[i], days: diff });
    }
  }

  // Milestones reached
  const milestonesReached = MILESTONES.filter(m => uniqueDays.length >= m);

  // Longest session
  let longestSessionEntry: HabitEntry | null = null;
  for (const e of entries) {
    if (e.duration_seconds != null && (!longestSessionEntry || (e.duration_seconds > (longestSessionEntry.duration_seconds ?? 0)))) {
      longestSessionEntry = e;
    }
  }

  // Practice highlights (patient only — factual phrases)
  const highlights: string[] = [];
  if (currentStreak >= 3) {
    highlights.push(`You've practiced ${currentStreak} days in a row.`);
  }
  if (longestStreak >= 7) {
    highlights.push(`Your longest streak reached ${longestStreak} consecutive days.`);
  }
  if (entries.length >= 10) {
    highlights.push(`You've completed ${entries.length} sessions so far.`);
  }
  if (adherencePercent >= 70) {
    highlights.push(`Your adherence rate is ${adherencePercent}% — above average.`);
  }
  if (uniqueDays.length >= 21) {
    highlights.push(`You've been active on ${uniqueDays.length} different days.`);
  }
  if (bestPeriod[1] > 0 && entries.length >= 5) {
    highlights.push(`${periodLabelsMap[bestPeriod[0] as keyof typeof periodLabelsMap]}s on ${bestDow}s seem to work best for you.`);
  }
  // Cap at 4
  const finalHighlights = highlights.slice(0, 4);

  // ── PDF ──
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 0;
  let currentPage = 1;

  // ── Helpers ──
  function drawWatermark() {
    try {
      const gs = doc.GState({ opacity: 0.045 });
      doc.setGState(gs);
      doc.addImage(`data:image/png;base64,${WATERMARK_PNG_B64}`, "PNG", PAGE_W / 2 - 60, PAGE_H / 2 - 60, 120, 120, undefined, "NONE");
      doc.setGState(doc.GState({ opacity: 1 }));
    } catch { /* ignore */ }
  }

  function drawHeader(): number {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, BAR_H, "F");
    try {
      doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", M, 4, 10, 10);
    } catch { /* ignore */ }
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...CREAM);
    doc.text("terapily", M + 14, BAR_H / 2 + 2);
    const tw = doc.getTextWidth("terapily");
    doc.setTextColor(...SAGE);
    doc.text(".", M + 14 + tw, BAR_H / 2 + 2);
    return BAR_H;
  }

  function drawFooter(page: number, total: number) {
    const fy = PAGE_H - 14;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(M, fy - 2, PAGE_W - M, fy - 2);

    try {
      doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", M, fy - 1, 4, 4);
    } catch { /* ignore */ }
    doc.setFont("times", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text("terapily", M + 5, fy + 2);
    const tw2 = doc.getTextWidth("terapily");
    doc.setTextColor(...SAGE);
    doc.text(".", M + 5 + tw2, fy + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...CHARCOAL);
    doc.text(`· ${new Date().getFullYear()}`, M + 5 + tw2 + 2, fy + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    doc.text(`${page} / ${total}`, PAGE_W / 2, fy + 2, { align: "center" });

    doc.setFontSize(5.5);
    doc.setTextColor(153, 153, 153);
    const disclaimer = variant === "therapist"
      ? "Platform-generated adherence summary. Does not replace clinical documentation in your EHR."
      : "This summary was generated by Terapily. It is not a diagnosis or treatment recommendation.";
    doc.text(disclaimer, PAGE_W - M, fy + 2, { align: "right" });
  }

  function checkPage(currentY: number, needed: number): number {
    if (currentY + needed > FOOTER_ZONE) {
      doc.addPage();
      currentPage++;
      drawWatermark();
      const hY = drawHeader();
      return hY + CONTENT_GAP;
    }
    return currentY;
  }

  // ── Section header helper ──
  function sectionTitle(text: string, atY: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(text, M, atY);
    return atY + 5;
  }

  // ── Page 1 ──
  drawWatermark();
  y = drawHeader();

  // Clinician copy band (therapist only)
  if (variant === "therapist") {
    doc.setFillColor(253, 232, 232);
    doc.rect(0, y, PAGE_W, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...RED);
    doc.text("CLINICIAN COPY — NOT INTENDED FOR PATIENT DISTRIBUTION", PAGE_W / 2, y + 6, { align: "center" });
    y += 12;
  } else {
    y += 5;
  }

  // ── Title ──
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  const title = variant === "patient" ? "Mindfulness Practice Summary" : "Mindfulness Adherence Report";
  doc.text(title, M, y + 5);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...CHARCOAL);
  const subtitle = variant === "patient"
    ? "Your practice journey at a glance"
    : "Summary of recorded mindfulness practice entries for your clinical records";
  doc.text(subtitle, M, y);
  y += 8;

  // ── Info Box ──
  const infoLines: [string, string][] = [
    ["Participant", patientName],
    ["Activity", activityTitle],
    ["Period", uniqueDays.length > 0 ? `${formatDate(uniqueDays[0])} — ${formatDate(uniqueDays[uniqueDays.length - 1])}` : "—"],
    ["Total Sessions", `${entries.length}`],
  ];
  if (variant === "therapist" && therapistInfo) {
    infoLines.push(["Therapist", therapistInfo.name]);
    infoLines.push(["Practice", therapistInfo.practice]);
    if (therapistInfo.license) infoLines.push(["License", therapistInfo.license]);
    if (therapistInfo.npi) infoLines.push(["NPI", therapistInfo.npi]);
  }
  infoLines.push(["Generated", formatDateTime(new Date())]);

  const infoBoxH = 12 + infoLines.length * 6;
  doc.setFillColor(247, 245, 240);
  doc.roundedRect(M, y, CW, infoBoxH, 2, 2, "F");

  let iy = y + 10;
  for (const [label, value] of infoLines) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(label, M + 4, iy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CHARCOAL);
    doc.text(value, M + 35, iy);
    iy += 6;
  }
  y += infoBoxH + 8;

  // ── Practice Highlights (patient only) ──
  if (variant === "patient" && finalHighlights.length > 0) {
    y = checkPage(y, 10 + finalHighlights.length * 6);
    doc.setFillColor(237, 245, 239); // sage bg
    doc.roundedRect(M, y, CW, 8 + finalHighlights.length * 5.5, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SAGE);
    doc.text("PRACTICE HIGHLIGHTS", M + 4, y + 6);

    let hy = y + 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...CHARCOAL);
    for (const h of finalHighlights) {
      doc.text(`•  ${h}`, M + 6, hy);
      hy += 5.5;
    }
    y += 10 + finalHighlights.length * 5.5 + 4;
  }

  // ── Streak Hero + Consistency Index ──
  y = checkPage(y, 36);
  doc.setFillColor(...CARD_COLORS.sage.bg);
  doc.roundedRect(M, y, CW, 30, 3, 3, "F");

  // Current streak (large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...NAVY);
  doc.text(`${currentStreak}`, M + 20, y + 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CHARCOAL);
  doc.text("CURRENT", M + 20, y + 23, { align: "center" });
  doc.text("STREAK", M + 20, y + 27, { align: "center" });

  // Divider
  doc.setDrawColor(200, 210, 200);
  doc.setLineWidth(0.3);
  doc.line(M + 40, y + 5, M + 40, y + 25);

  // Longest streak
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...SAGE);
  doc.text(`${longestStreak}d`, M + 55, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...CHARCOAL);
  doc.text("LONGEST STREAK", M + 55, y + 20);

  // Adherence
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...CARD_COLORS.teal.accent);
  doc.text(`${adherencePercent}%`, M + 95, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...CHARCOAL);
  doc.text("ADHERENCE", M + 95, y + 20);

  // Adherence bar
  const barX = M + 120;
  const barTotalW = CW - 120 - 4;
  doc.setFillColor(220, 218, 210);
  doc.roundedRect(barX, y + 11, barTotalW, 5, 1.5, 1.5, "F");
  if (adherencePercent > 0) {
    const fillW = Math.max(3, (adherencePercent / 100) * barTotalW);
    doc.setFillColor(...SAGE);
    doc.roundedRect(barX, y + 11, fillW, 5, 1.5, 1.5, "F");
  }
  y += 36;

  // ── Consistency Index ──
  y = checkPage(y, 22);
  doc.setFillColor(247, 245, 240); // cream bg
  doc.roundedRect(M, y, CW, 16, 2, 2, "F");

  // Score circle
  const ciX = M + 14;
  const ciY = y + 8;
  const ciRadius = 5.5;
  // Background circle
  doc.setDrawColor(220, 218, 210);
  doc.setLineWidth(1.8);
  doc.circle(ciX, ciY, ciRadius, "S");
  // Filled arc (approximate with color)
  if (consistencyIndex > 0) {
    const ciColor = consistencyIndex >= 70 ? SAGE : consistencyIndex >= 40 ? CARD_COLORS.amber.accent : MAUVE;
    doc.setDrawColor(...ciColor);
    doc.setLineWidth(1.8);
    // Draw partial arc as a visual indicator
    const arcAngle = (consistencyIndex / 100) * 360;
    const steps = Math.max(1, Math.round(arcAngle / 10));
    for (let s = 0; s < steps; s++) {
      const a1 = -90 + (s / steps) * arcAngle;
      const a2 = -90 + ((s + 1) / steps) * arcAngle;
      const x1 = ciX + ciRadius * Math.cos((a1 * Math.PI) / 180);
      const y1c = ciY + ciRadius * Math.sin((a1 * Math.PI) / 180);
      const x2 = ciX + ciRadius * Math.cos((a2 * Math.PI) / 180);
      const y2c = ciY + ciRadius * Math.sin((a2 * Math.PI) / 180);
      doc.line(x1, y1c, x2, y2c);
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(`${consistencyIndex}`, ciX, ciY + 2, { align: "center" });

  // Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("Consistency Index", M + 26, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...CHARCOAL);
  const ciDesc = consistencyIndex >= 70
    ? "High regularity in practice frequency and timing."
    : consistencyIndex >= 40
    ? "Moderate regularity — practice occurs but with some variability."
    : "Building a routine — frequency and timing are still variable.";
  doc.text(ciDesc, M + 26, y + 11);

  // Disclaimer
  doc.setFontSize(5);
  doc.setTextColor(153, 153, 153);
  doc.text("This index measures practice regularity, not clinical outcomes. It is not a health metric.", M + 26, y + 15);

  y += 20;

  // ── Stats Cards ──
  y = checkPage(y, 24);
  const statsData = [
    { label: "TOTAL SESSIONS", value: `${entries.length}`, colorKey: "sage" as const },
    { label: "ACTIVE DAYS", value: `${uniqueDays.length}`, colorKey: "mauve" as const },
    { label: "TOTAL TIME", value: totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(1)}h` : `${Math.round(totalMinutes)}min`, colorKey: "cream" as const },
    { label: "AVG DURATION", value: entries.length > 0 ? `${Math.round(totalMinutes / entries.length)}min` : "—", colorKey: "teal" as const },
    { label: "AVG/DAY", value: uniqueDays.length > 0 ? `${(entries.length / uniqueDays.length).toFixed(1)}` : "—", colorKey: "amber" as const },
  ];

  const cardW = (CW - 4 * 3) / 5;
  for (let i = 0; i < statsData.length; i++) {
    const cx = M + i * (cardW + 3);
    const colors = CARD_COLORS[statsData[i].colorKey];
    doc.setFillColor(...colors.bg);
    doc.roundedRect(cx, y, cardW, 18, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...colors.accent);
    doc.text(statsData[i].value, cx + cardW / 2, y + 9, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);
    doc.setTextColor(...CHARCOAL);
    doc.text(statsData[i].label, cx + cardW / 2, y + 14, { align: "center" });
  }
  y += 24;

  // ── Milestones (if any reached) ──
  if (milestonesReached.length > 0) {
    y = checkPage(y, 14);
    y = sectionTitle("MILESTONES REACHED", y);
    const msW = CW / MILESTONES.length;
    for (let i = 0; i < MILESTONES.length; i++) {
      const mx = M + i * msW + msW / 2;
      const reached = milestonesReached.includes(MILESTONES[i]);
      // Circle
      if (reached) {
        doc.setFillColor(...SAGE);
        doc.circle(mx, y + 3, 3.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(...WHITE);
        doc.text("✓", mx, y + 4.5, { align: "center" });
      } else {
        doc.setDrawColor(220, 218, 210);
        doc.setLineWidth(0.5);
        doc.circle(mx, y + 3, 3.5, "S");
      }
      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5);
      doc.setTextColor(reached ? NAVY[0] : 180, reached ? NAVY[1] : 180, reached ? NAVY[2] : 180);
      doc.text(`${MILESTONES[i]}d`, mx, y + 9, { align: "center" });
    }
    y += 14;
  }

  // ── Heatmap (8 weeks = 56 days) ──
  y = checkPage(y, 55);
  y = sectionTitle("ACTIVITY HEATMAP — 8 WEEKS", y);

  const cellSize = 5;
  const cellGap = 1.2;
  const heatmapDays: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    heatmapDays.push({ date: key, count: countByDay[key] ?? 0, dayOfWeek: d.getDay() });
  }
  const hmMax = Math.max(1, ...heatmapDays.map((d) => d.count));

  // Day labels
  const dayLabelsShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const labelOffset = 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(150, 150, 150);
  for (let r = 0; r < 7; r++) {
    if (r % 2 === 1) {
      doc.text(dayLabelsShort[r], M, y + r * (cellSize + cellGap) + cellSize / 2 + 1);
    }
  }

  // Grid
  for (let i = 0; i < heatmapDays.length; i++) {
    const col = Math.floor(i / 7);
    const row = i % 7;
    const cx = M + labelOffset + col * (cellSize + cellGap);
    const cy = y + row * (cellSize + cellGap);

    let level = 0;
    if (heatmapDays[i].count > 0) {
      const ratio = heatmapDays[i].count / hmMax;
      if (ratio <= 0.25) level = 1;
      else if (ratio <= 0.5) level = 2;
      else if (ratio <= 0.75) level = 3;
      else level = 4;
    }
    doc.setFillColor(...HEATMAP_LEVELS[level]);
    doc.roundedRect(cx, cy, cellSize, cellSize, 1, 1, "F");
  }

  // Month labels at top
  let lastMonth = -1;
  for (let i = 0; i < heatmapDays.length; i += 7) {
    const d = new Date(heatmapDays[i].date);
    if (d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      const col = Math.floor(i / 7);
      const cx = M + labelOffset + col * (cellSize + cellGap);
      doc.setFontSize(5);
      doc.setTextColor(150, 150, 150);
      doc.text(d.toLocaleDateString("en-US", { month: "short" }), cx, y - 1.5);
    }
  }

  // Legend
  const legendX = M + labelOffset + 8 * (cellSize + cellGap) + 8;
  const legendY = y + 3;
  doc.setFontSize(4.5);
  doc.setTextColor(150, 150, 150);
  doc.text("Less", legendX, legendY + 3);
  for (let l = 0; l < 5; l++) {
    doc.setFillColor(...HEATMAP_LEVELS[l]);
    doc.roundedRect(legendX + 8 + l * (cellSize + 0.8), legendY, cellSize - 0.5, cellSize - 0.5, 0.8, 0.8, "F");
  }
  doc.text("More", legendX + 8 + 5 * (cellSize + 0.8) + 1, legendY + 3);

  y += 7 * (cellSize + cellGap) + 4;

  // ── Best Pattern (below heatmap) ──
  if (entries.length >= 3) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SAGE);
    doc.text(`Best pattern: ${bestDow}s, ${periodLabelsMap[bestPeriod[0] as keyof typeof periodLabelsMap]} (${bestPeriod[1]} of ${entries.length} sessions)`, M, y + 2);
    y += 7;
  } else {
    y += 3;
  }

  // ── Daily Frequency Chart (30 days) ──
  y = checkPage(y, 50);
  y = sectionTitle("DAILY FREQUENCY — LAST 30 DAYS", y);

  const chartH = 35;
  const last30: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last30.push({ date: key, count: countByDay[key] ?? 0 });
  }
  const maxCount = Math.max(1, ...last30.map((d) => d.count));
  const barW = CW / 30;

  // Grid lines (dotted)
  doc.setDrawColor(220, 218, 210);
  doc.setLineWidth(0.15);
  for (let g = 0; g <= 4; g++) {
    const gy = y + chartH - (g / 4) * chartH;
    doc.setLineDashPattern([1, 1.5], 0);
    doc.line(M, gy, M + CW, gy);
  }
  doc.setLineDashPattern([], 0);

  // Y-axis labels
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(150, 150, 150);
  doc.text(`${maxCount}`, M - 2, y + 2, { align: "right" });
  doc.text("0", M - 2, y + chartH + 1, { align: "right" });

  // Bars with gradient effect
  for (let i = 0; i < last30.length; i++) {
    const barHeight = last30[i].count === 0 ? 0 : (last30[i].count / maxCount) * chartH;
    const bx = M + i * barW + barW * 0.15;
    const bw = barW * 0.7;

    if (barHeight > 0) {
      const ratio = last30[i].count / maxCount;
      const r = Math.round(126 - ratio * 95);
      const g = Math.round(155 - ratio * 113);
      const b = Math.round(134 - ratio * 80);
      doc.setFillColor(r, g, b);
      doc.roundedRect(bx, y + chartH - barHeight, bw, barHeight, 0.8, 0.8, "F");

      if (last30[i].count > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.5);
        doc.setTextColor(...NAVY);
        doc.text(`${last30[i].count}`, bx + bw / 2, y + chartH - barHeight - 1.5, { align: "center" });
      }
    }

    // X labels every 5 days
    if (i % 5 === 0 || i === 29) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.5);
      doc.setTextColor(150, 150, 150);
      const dateLabel = new Date(last30[i].date).toLocaleDateString("en-US", { day: "numeric", month: "short" });
      doc.text(dateLabel, bx + bw / 2, y + chartH + 4, { align: "center" });
    }
  }
  y += chartH + 10;

  // ── THERAPIST-ONLY: Numeric Trend ──
  if (variant === "therapist") {
    y = checkPage(y, 18);
    doc.setFillColor(237, 245, 239); // sage bg
    doc.roundedRect(M, y, CW, 12, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("WEEKLY TREND", M + 4, y + 5);

    const trendColor = trendPercent > 0 ? SAGE : trendPercent < 0 ? RED : CHARCOAL;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...trendColor);
    doc.text(`${trendArrow} ${Math.abs(trendPercent)}%`, M + 50, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    doc.text(`This week: ${thisWeekCount} sessions  |  Last week: ${lastWeekCount} sessions`, M + 80, y + 7);

    y += 16;
  }

  // ── THERAPIST-ONLY: Weekly Comparison ──
  if (variant === "therapist") {
    y = checkPage(y, 50);
    y = sectionTitle("WEEKLY COMPARISON — LAST 8 WEEKS", y);

    const weeklyCounts: { label: string; count: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - w * 7);
      let wCount = 0;
      for (let d = 0; d < 7; d++) {
        const dd = new Date(weekStart);
        dd.setDate(dd.getDate() + d);
        wCount += countByDay[dd.toISOString().slice(0, 10)] ?? 0;
      }
      weeklyCounts.push({
        label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: wCount,
      });
    }
    const wMax = Math.max(1, ...weeklyCounts.map((w) => w.count));
    const wChartH = 28;
    const wBarW = CW / 8;

    for (let i = 0; i < weeklyCounts.length; i++) {
      const bh = weeklyCounts[i].count === 0 ? 0 : (weeklyCounts[i].count / wMax) * wChartH;
      const bx = M + i * wBarW + wBarW * 0.2;
      const bw = wBarW * 0.6;

      if (bh > 0) {
        doc.setFillColor(...SAGE);
        doc.roundedRect(bx, y + wChartH - bh, bw, bh, 1, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(...NAVY);
        doc.text(`${weeklyCounts[i].count}`, bx + bw / 2, y + wChartH - bh - 1.5, { align: "center" });
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.5);
      doc.setTextColor(150, 150, 150);
      doc.text(weeklyCounts[i].label, bx + bw / 2, y + wChartH + 4, { align: "center" });
    }
    y += wChartH + 10;
  }

  // ── THERAPIST-ONLY: Day-of-week patterns ──
  if (variant === "therapist") {
    y = checkPage(y, 55);
    y = sectionTitle("PRACTICE PATTERNS", y);
    y += 1;

    const dowMax = Math.max(1, ...dowCounts);

    // Header
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, y, CW / 2 - 2, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...WHITE);
    doc.text("DAY", M + 3, y + 4.5);
    doc.text("SESSIONS", M + 25, y + 4.5);
    y += 8;

    const dowLabelsShortFull = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let d = 0; d < 7; d++) {
      if (d % 2 === 0) {
        doc.setFillColor(249, 247, 243);
        doc.rect(M, y, CW / 2 - 2, 5.5, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...CHARCOAL);
      doc.text(dowLabelsShortFull[d], M + 3, y + 3.8);
      doc.text(`${dowCounts[d]}`, M + 28, y + 3.8);

      const barLen = dowCounts[d] === 0 ? 0 : (dowCounts[d] / dowMax) * 40;
      if (barLen > 0) {
        doc.setFillColor(...SAGE);
        doc.roundedRect(M + 38, y + 1, barLen, 3.5, 0.8, 0.8, "F");
      }
      y += 5.5;
    }

    y += 3;
    const periodLabelsDetailed = { morning: "Morning (6am-12pm)", afternoon: "Afternoon (12pm-6pm)", evening: "Evening (6pm-12am)" };
    const preferred = Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    doc.text(`Preferred time: ${periodLabelsDetailed[preferred[0] as keyof typeof periodLabelsDetailed]} (${preferred[1]} sessions)`, M, y);
    y += 5;

    if (minDur < Infinity) {
      doc.text(`Session duration range: ${Math.round(minDur / 60)}min — ${Math.round(maxDur / 60)}min`, M, y);
      y += 5;
    }
    if (totalCycles > 0) {
      doc.text(`Total cycles completed: ${totalCycles}`, M, y);
      y += 5;
    }
    y += 3;
  }

  // ── THERAPIST-ONLY: Inactivity Gaps ──
  if (variant === "therapist" && gaps.length > 0) {
    y = checkPage(y, 12 + Math.min(gaps.length, 10) * 7);
    y = sectionTitle("INACTIVITY GAPS (> 3 DAYS)", y);
    y += 1;

    for (const gap of gaps.slice(0, 10)) {
      y = checkPage(y, 8);
      doc.setFillColor(...CARD_COLORS.mauve.bg);
      doc.roundedRect(M, y, CW, 6, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...CHARCOAL);
      doc.text(`${formatDate(gap.start)} → ${formatDate(gap.end)}`, M + 3, y + 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MAUVE);
      doc.text(`${gap.days} days`, M + CW - 3, y + 4, { align: "right" });
      y += 7;
    }
    y += 4;
  }

  // ── Notice ──
  y = checkPage(y, 36);
  if (variant === "patient") {
    const maxEntries = 10;
    const timelineEntries = entries.slice(0, Math.min(maxEntries, entries.length));

    if (timelineEntries.length > 0) {
      y = checkPage(y, 18 + timelineEntries.length * 10);
      y = sectionTitle("RECENT SESSIONS", y);
      y += 2;

      for (let i = 0; i < timelineEntries.length; i++) {
        y = checkPage(y, 10);
        const e = timelineEntries[i];
        const d = new Date(e.completed_at);
        const dur = e.duration_seconds != null ? Math.round(e.duration_seconds / 60) : null;

        // Dot + connector line
        const dotX = M + 4;
        const dotY = y + 3;
        const isLongest = longestSessionEntry && e.id === longestSessionEntry.id;
        const dotR = isLongest ? 2.5 : 1.8;

        doc.setFillColor(isLongest ? SAGE[0] : NAVY[0], isLongest ? SAGE[1] : NAVY[1], isLongest ? SAGE[2] : NAVY[2]);
        doc.circle(dotX, dotY, dotR, "F");

        // Connector to next
        if (i < timelineEntries.length - 1) {
          doc.setDrawColor(220, 218, 210);
          doc.setLineWidth(0.3);
          doc.line(dotX, dotY + dotR + 0.5, dotX, y + 9);
        }

        // Date & time
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...NAVY);
        doc.text(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), M + 10, y + 3);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...CHARCOAL);
        doc.text(d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), M + 35, y + 3);

        if (dur != null) {
          doc.text(`${dur} min`, M + 55, y + 3);
        }
        if (e.cycles_completed != null) {
          doc.text(`${e.cycles_completed} cycles`, M + 73, y + 3);
        }

        // Longest session marker
        if (isLongest) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5);
          doc.setTextColor(...SAGE);
          doc.text("LONGEST", M + CW - 3, y + 3, { align: "right" });
        }

        // Check if milestone day
        const entryDate = d.toISOString().slice(0, 10);
        const dayIndex = uniqueDays.indexOf(entryDate);
        if (dayIndex >= 0 && MILESTONES.includes(dayIndex + 1)) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5);
          doc.setTextColor(...CARD_COLORS.amber.accent);
          doc.text(`DAY ${dayIndex + 1}`, M + CW - 18, y + 3, { align: "right" });
        }

        y += 9;
      }

      if (entries.length > maxEntries) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text(`+ ${entries.length - maxEntries} earlier sessions`, M + 10, y + 1);
        y += 5;
      }
      y += 4;
    }
  } else {
    // Therapist: full session log table
    const timelineEntries = entries.slice(0, 50);
    if (timelineEntries.length > 0) {
      y = checkPage(y, 18);
      y = sectionTitle("SESSION LOG", y);
      y += 2;

      function drawTimelineHeader(startY: number): number {
        doc.setFillColor(...NAVY);
        doc.roundedRect(M, startY, CW, 7, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...WHITE);
        doc.text("DATE", M + 4, startY + 4.5);
        doc.text("TIME", M + 40, startY + 4.5);
        doc.text("DURATION", M + 70, startY + 4.5);
        doc.text("CYCLES", M + 105, startY + 4.5);
        return startY + 9;
      }

      y = drawTimelineHeader(y);
      let prevTimelinePage = currentPage;

      for (let i = 0; i < timelineEntries.length; i++) {
        y = checkPage(y, 6);
        if (currentPage !== prevTimelinePage) {
          y = drawTimelineHeader(y);
          prevTimelinePage = currentPage;
        }

        const e = timelineEntries[i];
        if (i % 2 === 0) {
          doc.setFillColor(249, 247, 243);
          doc.rect(M, y, CW, 5.5, "F");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...CHARCOAL);

        const d = new Date(e.completed_at);
        doc.text(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), M + 4, y + 3.8);
        doc.text(d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), M + 40, y + 3.8);
        doc.text(e.duration_seconds != null ? `${Math.round(e.duration_seconds / 60)} min` : "—", M + 70, y + 3.8);
        doc.text(e.cycles_completed != null ? `${e.cycles_completed}` : "—", M + 105, y + 3.8);

        y += 5.5;
      }
      y += 4;
    }
  }

  // ── Notice ──
  y = checkPage(y, 36);
  if (variant === "patient") {
    doc.setFillColor(255, 248, 225);
    doc.setDrawColor(240, 208, 96);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, CW, 28, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("About This Report", M + 6, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...CHARCOAL);
    const noticeLines = [
      "This report shows your mindfulness practice frequency and consistency over time.",
      "It is provided for informational purposes and does not constitute a clinical assessment.",
      "The Consistency Index measures regularity of practice, not health outcomes.",
      "Please discuss your practice patterns with your therapist for personalized guidance.",
    ];
    let ny = y + 12;
    for (const line of noticeLines) {
      doc.text(line, M + 6, ny);
      ny += 4;
    }
  } else {
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text("Notices", M, y + 5);
    y += 12;

    const notices = [
      "This report is a platform-generated summary of mindfulness practice adherence data. It reproduces session timestamps, durations, and cycle counts exactly as recorded by the patient.",
      "The Consistency Index (0-100) measures regularity of practice based on frequency, timing regularity, and gap penalization. It is not a clinical metric and should not be used to evaluate treatment efficacy.",
      "Clinical interpretation of adherence patterns, including the significance of gaps and frequency changes, remains the sole responsibility of the treating clinician.",
      "Practice data is recorded via reusable habit links and is not considered Protected Health Information (PHI) in isolation. However, when linked to patient identity, handle according to your practice's privacy policies.",
    ];

    for (const notice of notices) {
      y = checkPage(y, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...CHARCOAL);
      const wrapped = doc.splitTextToSize(notice, CW - 2);
      for (const line of wrapped) {
        y = checkPage(y, 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...CHARCOAL);
        doc.text(line, M, y);
        y += 4;
      }
      y += 3;
    }
  }

  // ── Footer + Pagination (2nd pass) ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Array.from(new Uint8Array(arrayBuffer));
}

// ── Legacy wrapper for backward compat ──
export async function generateHabitProgressPdf(params: HabitReportParams): Promise<number[]> {
  return buildHabitReportPDF(params, "patient");
}

// ── Helpers ──

function calcStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;
  let streak = 1;
  const today = new Date().toISOString().slice(0, 10);
  if (sortedDatesDesc[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (sortedDatesDesc[0] !== yesterday.toISOString().slice(0, 10)) return 0;
  }
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const prev = new Date(sortedDatesDesc[i - 1]);
    const curr = new Date(sortedDatesDesc[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.01) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calcLongestStreak(sortedDatesAsc: string[]): number {
  if (sortedDatesAsc.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedDatesAsc.length; i++) {
    const prev = new Date(sortedDatesAsc[i - 1]);
    const curr = new Date(sortedDatesAsc[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.01) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

/**
 * Consistency Index (0-100)
 * - Frequency weight (40%): active days / total period
 * - Regularity weight (30%): inverse of std dev of gaps between sessions
 * - Gap penalty (30%): penalizes gaps > 3 days
 */
function calcConsistencyIndex(sortedDatesAsc: string[], totalEntries: number): number {
  if (sortedDatesAsc.length < 2) return sortedDatesAsc.length === 1 ? 50 : 0;

  const first = new Date(sortedDatesAsc[0]);
  const last = new Date(sortedDatesAsc[sortedDatesAsc.length - 1]);
  const totalDays = Math.max(1, Math.round((last.getTime() - first.getTime()) / 86400000) + 1);

  // Frequency (40%)
  const freqScore = Math.min(1, sortedDatesAsc.length / totalDays) * 40;

  // Regularity (30%) — inverse of coefficient of variation of gaps
  const gapsBetween: number[] = [];
  for (let i = 1; i < sortedDatesAsc.length; i++) {
    const diff = Math.round((new Date(sortedDatesAsc[i]).getTime() - new Date(sortedDatesAsc[i - 1]).getTime()) / 86400000);
    gapsBetween.push(diff);
  }
  const avgGap = gapsBetween.reduce((s, g) => s + g, 0) / gapsBetween.length;
  const variance = gapsBetween.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gapsBetween.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgGap > 0 ? stdDev / avgGap : 0;
  const regScore = Math.max(0, (1 - Math.min(cv, 2) / 2)) * 30;

  // Gap penalty (30%) — penalize gaps > 3 days
  const bigGaps = gapsBetween.filter(g => g > 3).length;
  const gapRatio = gapsBetween.length > 0 ? bigGaps / gapsBetween.length : 0;
  const gapScore = Math.max(0, (1 - gapRatio)) * 30;

  return Math.round(freqScore + regScore + gapScore);
}

function countEntriesInRange(entries: HabitEntry[], daysAgo: number, daysAgoEnd: number, today: Date): number {
  const start = new Date(today);
  start.setDate(start.getDate() - daysAgoEnd);
  const end = new Date(today);
  end.setDate(end.getDate() - daysAgo);
  return entries.filter(e => {
    const d = new Date(e.completed_at);
    return d >= start && d < end;
  }).length;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d: Date): string {
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}
