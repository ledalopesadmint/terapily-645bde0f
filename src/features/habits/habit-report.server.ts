/**
 * Habit progress report — server-only PDF generation.
 *
 * Generates a branded PDF with:
 *  - Header with Terapily branding (Navy bar, icon, watermark)
 *  - Patient display name + activity title
 *  - Stats summary (total, streak, longest streak, adherence %, time)
 *  - Daily frequency bar chart (drawn with jsPDF primitives)
 *  - 7-week heatmap
 *  - Entry timeline
 *  - Footer with disclaimers
 *
 * Brand rules: same as Compliance Report (Navy header, watermark, footer).
 * NO PHI in metadata — only display_name (non-PHI) and UUIDs.
 */

import { jsPDF } from "jspdf";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ICON_PNG_B64, WATERMARK_PNG_B64 } from "@/features/activities/pdf-brand-assets.server";

// ── Brand colors ──
const NAVY = [31, 42, 54] as const;
const CREAM = [244, 239, 230] as const;
const SAGE = [126, 155, 134] as const;
const CHARCOAL = [58, 63, 71] as const;
const WHITE = [255, 255, 255] as const;

const M = 18; // margin
const PAGE_W = 210;
const PAGE_H = 297;
const CW = PAGE_W - M * 2;
const FOOTER_ZONE = PAGE_H - 22;

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

export async function generateHabitProgressPdf(params: HabitReportParams): Promise<number[]> {
  const { habitLinkId, workspaceId, patientId } = params;

  // Fetch habit link
  const { data: link } = await supabaseAdmin
    .from("habit_links")
    .select("id, activity_id, total_entries, last_entry_at, created_at, expires_at, status")
    .eq("id", habitLinkId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!link) throw new Error("Link não encontrado.");

  // Fetch activity title
  const { data: activity } = await supabaseAdmin
    .from("activity_catalog")
    .select("title, slug")
    .eq("id", link.activity_id)
    .maybeSingle();

  // Fetch patient display name
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("display_name, initials")
    .eq("id", patientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  // Fetch entries
  const { data: rawEntries } = await supabaseAdmin
    .from("habit_entries")
    .select("id, completed_at, duration_seconds, cycles_completed")
    .eq("habit_link_id", habitLinkId)
    .eq("workspace_id", workspaceId)
    .order("completed_at", { ascending: false })
    .limit(500);

  const entries: HabitEntry[] = rawEntries ?? [];
  const activityTitle = activity?.title ?? "Atividade";
  const patientName = patient?.display_name ?? "Paciente";

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

  // Daily counts (last 30 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const countByDay: Record<string, number> = {};
  for (const e of entries) {
    const d = new Date(e.completed_at).toISOString().slice(0, 10);
    countByDay[d] = (countByDay[d] ?? 0) + 1;
  }
  const last30: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last30.push({ date: key, count: countByDay[key] ?? 0 });
  }

  // ── PDF Generation ──
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 0;

  // Watermark
  try {
    doc.addImage(`data:image/png;base64,${WATERMARK_PNG_B64}`, "PNG", PAGE_W / 2 - 40, PAGE_H / 2 - 40, 80, 80, undefined, "NONE");
    doc.setGState(doc.GState({ opacity: 0.04 }));
  } catch {
    // ignore watermark errors
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // ── Header ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 32, "F");
  try {
    doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", M, 6, 10, 10);
  } catch {
    // ignore
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text("terapily", M + 14, 14);
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text("Relatório de Progresso — Práticas de Mindfulness", M + 14, 20);
  doc.setFontSize(7);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, M + 14, 26);
  y = 40;

  // ── Patient & Activity info ──
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(patientName, M, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...CHARCOAL);
  doc.text(`Atividade: ${activityTitle}`, M, y);
  y += 5;
  doc.text(`Período: ${uniqueDays.length > 0 ? uniqueDays[0] : "—"} a ${uniqueDays.length > 0 ? uniqueDays[uniqueDays.length - 1] : "—"}`, M, y);
  y += 10;

  // ── Stats Summary ──
  doc.setFillColor(...CREAM);
  doc.roundedRect(M, y, CW, 24, 3, 3, "F");

  const statW = CW / 5;
  const stats = [
    { label: "Total", value: `${entries.length}` },
    { label: "Sequência atual", value: `${currentStreak}d` },
    { label: "Maior sequência", value: `${longestStreak}d` },
    { label: "Aderência", value: `${adherencePercent}%` },
    { label: "Tempo total", value: totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(1)}h` : `${Math.round(totalMinutes)}min` },
  ];

  for (let i = 0; i < stats.length; i++) {
    const sx = M + i * statW + statW / 2;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(stats[i].value, sx, y + 10, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CHARCOAL);
    doc.text(stats[i].label.toUpperCase(), sx, y + 16, { align: "center" });
  }
  y += 30;

  // ── Bar chart: Daily frequency (last 30 days) ──
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("FREQUÊNCIA DIÁRIA — ÚLTIMOS 30 DIAS", M, y);
  y += 5;

  const chartH = 35;
  const chartW = CW;
  const maxCount = Math.max(1, ...last30.map((d) => d.count));
  const barW = chartW / 30;

  // Y-axis labels
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...CHARCOAL);
  doc.text(`${maxCount}`, M - 2, y + 2, { align: "right" });
  doc.text("0", M - 2, y + chartH, { align: "right" });

  // Grid line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(M, y + chartH, M + chartW, y + chartH);

  // Bars
  for (let i = 0; i < last30.length; i++) {
    const barH = last30[i].count === 0 ? 0 : (last30[i].count / maxCount) * chartH;
    const bx = M + i * barW + barW * 0.15;
    const bw = barW * 0.7;

    if (barH > 0) {
      doc.setFillColor(...SAGE);
      doc.roundedRect(bx, y + chartH - barH, bw, barH, 0.8, 0.8, "F");
    }

    // X labels every 7 days
    if (i % 7 === 0) {
      doc.setFontSize(5);
      doc.setTextColor(...CHARCOAL);
      const dateLabel = new Date(last30[i].date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      doc.text(dateLabel, bx + bw / 2, y + chartH + 4, { align: "center" });
    }
  }
  y += chartH + 10;

  // ── Heatmap: 7 weeks ──
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("MAPA DE ATIVIDADE — 7 SEMANAS", M, y);
  y += 5;

  const cellSize = 4;
  const cellGap = 1;
  const heatmapDays: { date: string; count: number }[] = [];
  for (let i = 48; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    heatmapDays.push({ date: key, count: countByDay[key] ?? 0 });
  }
  const hmMax = Math.max(1, ...heatmapDays.map((d) => d.count));

  for (let i = 0; i < heatmapDays.length; i++) {
    const col = Math.floor(i / 7);
    const row = i % 7;
    const cx = M + col * (cellSize + cellGap);
    const cy = y + row * (cellSize + cellGap);
    const intensity = heatmapDays[i].count === 0 ? 0 : Math.min(1, heatmapDays[i].count / hmMax);

    if (heatmapDays[i].count === 0) {
      doc.setFillColor(235, 235, 230);
    } else {
      const r = Math.round(126 - intensity * 40);
      const g = Math.round(155 - intensity * 30);
      const b = Math.round(134 - intensity * 40);
      doc.setFillColor(r, g, b);
    }
    doc.roundedRect(cx, cy, cellSize, cellSize, 0.5, 0.5, "F");
  }
  y += 7 * (cellSize + cellGap) + 6;

  // ── Total cycles info ──
  if (totalCycles > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CHARCOAL);
    doc.text(`Total de ciclos completados: ${totalCycles}`, M, y);
    y += 6;
  }

  // ── Recent entries timeline ──
  if (entries.length > 0) {
    // Check page space
    if (y > FOOTER_ZONE - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("ÚLTIMAS PRÁTICAS", M, y);
    y += 5;

    const maxEntries = Math.min(entries.length, 15);
    for (let i = 0; i < maxEntries; i++) {
      if (y > FOOTER_ZONE - 8) {
        doc.addPage();
        y = 20;
      }

      const e = entries[i];
      const dateStr = new Date(e.completed_at).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timeStr = new Date(e.completed_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const durStr = e.duration_seconds ? `${Math.round(e.duration_seconds / 60)}min` : "";
      const cycStr = e.cycles_completed ? `${e.cycles_completed} ciclos` : "";

      // Dot
      doc.setFillColor(...SAGE);
      doc.circle(M + 2, y + 1, 1, "F");

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...CHARCOAL);
      doc.text(`${dateStr} · ${timeStr}`, M + 5, y + 2);

      const details = [durStr, cycStr].filter(Boolean).join(" · ");
      if (details) {
        doc.setTextColor(150, 150, 150);
        doc.text(details, M + CW, y + 2, { align: "right" });
      }
      y += 5;
    }

    if (entries.length > maxEntries) {
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(`+ ${entries.length - maxEntries} práticas anteriores`, M + 5, y + 2);
      y += 5;
    }
  }

  // ── Footer ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...SAGE);
    doc.setLineWidth(0.3);
    doc.line(M, FOOTER_ZONE, M + CW, FOOTER_ZONE);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CHARCOAL);
    doc.text(
      "Este relatório apresenta dados de execução de práticas de mindfulness. Não constitui diagnóstico nem recomendação clínica.",
      M, FOOTER_ZONE + 4,
    );
    doc.text(
      `terapily.com · Página ${p} de ${totalPages}`,
      M + CW, FOOTER_ZONE + 4,
      { align: "right" },
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Array.from(new Uint8Array(arrayBuffer));
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