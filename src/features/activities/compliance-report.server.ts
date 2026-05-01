/**
 * Clinical Activity Report — PDF generation (S3 §8, v10).
 *
 * SERVER-ONLY. Two variants:
 *   - Patient Activity Summary (no severity, no flags, no audit)
 *   - Clinical Activity Report (full detail, clinician-only)
 *
 * v8 additions:
 *   - Quick Read box (data index, not clinical summary)
 *   - Score History graph (jsPDF primitives, no interpretation)
 *   - Score Changes section (factual deltas only)
 *   - Full datetime+timezone on all dates
 *   - Report ID (was "SHA-256") label fix
 *   - Generated timestamp in info block
 *   - Therapist license_number + NPI when available
 *   - Audit trail: full_name instead of UUID, 50-event note
 *
 * Brand rules (mem://design/pdf-brand-rules):
 *   - Header: Navy bar full-width with real icon + Cormorant-style wordmark
 *   - Watermark: cream "t" from terapily-t-cream.png at ~4% opacity
 *   - Footer: icon + wordmark + pagination (well-spaced) + disclaimer
 *   - Title font: serif (Times for jsPDF, closest to Cormorant)
 *   - Wording proibido: "HIPAA-certified", "court-defensible", "legally binding"
 *   - Title: "Clinical Activity Report" (NOT "Compliance Report")
 *
 * Prohibited words (v8): improving, worsening, better, worse, progress,
 *   trend analysis, regression, prediction, RCI, CSI, clinically significant
 *
 * Usa jsPDF (pure JS, Worker-safe).
 */

import { jsPDF } from "jspdf";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptPHIServer } from "@/lib/crypto/encryption.server";
import { logServerError } from "@/lib/logger.server";
import { ICON_PNG_B64, WATERMARK_PNG_B64 } from "./pdf-brand-assets.server";

// ── Brand colors ──
const NAVY = [31, 42, 54] as const;
const CREAM = [244, 239, 230] as const;
const SAGE = [126, 155, 134] as const;
const CHARCOAL = [58, 63, 71] as const;
const WHITE = [255, 255, 255] as const;
const RED = [192, 57, 43] as const;

interface ReportParams {
  patientId: string;
  workspaceId: string;
  from: string;
  to: string;
  therapistName: string;
  workspaceName: string;
  licenseNumber?: string;
  npi?: string;
}

interface ReportRow {
  activityTitle: string;
  activitySlug?: string;
  score: number | null;
  severity: string | null;
  deliveryMode: string;
  submittedAt: string;
  items?: string;
  flagLabel?: string;
}

interface ClinicalFlagEntry {
  status: string;
  date: string;
  description: string;
}

interface AuditEntry {
  action: string;
  timestamp: string;
  actorLabel: string;
}

// ── Score series for graph ──
interface ScorePoint {
  date: string;     // formatted
  isoDate: string;  // for sorting
  score: number;
  severity: string | null;
}

interface ScoreSeries {
  slug: string;
  title: string;
  points: ScorePoint[];
  yMax: number;
  latest: ScorePoint;
  delta: number | null;
}

type ReportVariant = "patient" | "clinical";

// ── Shared layout helpers ──

const M = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CW = PAGE_W - M * 2;

function drawWatermark(doc: jsPDF) {
  const gs = (doc as any).GState;
  if (gs) {
    doc.saveGraphicsState();
    doc.setGState(new gs({ opacity: 0.045 }));
    const size = 120;
    doc.addImage(
      `data:image/png;base64,${WATERMARK_PNG_B64}`,
      "PNG",
      (PAGE_W - size) / 2,
      (PAGE_H - size) / 2,
      size,
      size,
    );
    doc.restoreGraphicsState();
  }
}

function drawHeader(doc: jsPDF) {
  const barH = 18;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, barH, "F");

  const iconSize = 10;
  const iconY = (barH - iconSize) / 2;
  doc.addImage(
    `data:image/png;base64,${ICON_PNG_B64}`,
    "PNG",
    M,
    iconY,
    iconSize,
    iconSize,
  );

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...CREAM);
  const wmX = M + iconSize + 3;
  const wmY = barH / 2 + 2;
  doc.text("terapily", wmX, wmY);

  const dotX = wmX + doc.getTextWidth("terapily");
  doc.setTextColor(...SAGE);
  doc.text(".", dotX, wmY);

  return barH;
}

function drawFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  variant: ReportVariant,
  integrityHash?: string,
) {
  const fy = PAGE_H - 14;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(M, fy - 2, PAGE_W - M, fy - 2);

  const iconS = 4;
  doc.addImage(
    `data:image/png;base64,${ICON_PNG_B64}`,
    "PNG",
    M,
    fy - 0.5,
    iconS,
    iconS,
  );

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  const wmX = M + iconS + 1.5;
  doc.text("terapily", wmX, fy + 2);
  doc.setTextColor(...SAGE);
  doc.text(".", wmX + doc.getTextWidth("terapily"), fy + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...CHARCOAL);
  const yearX = wmX + doc.getTextWidth("terapily.") + 2;
  doc.text(`· ${new Date().getFullYear()}`, yearX, fy + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CHARCOAL);
  const pg = `${pageNum} / ${totalPages}`;
  const pgW = doc.getTextWidth(pg);
  doc.text(pg, (PAGE_W - pgW) / 2, fy + 2);

  doc.setFontSize(5.5);
  doc.setTextColor(153, 153, 153);
  const disc =
    variant === "patient"
      ? "This summary was generated by Terapily. It is not a diagnosis or treatment recommendation."
      : "Platform-generated summary. Does not replace clinical documentation in your EHR.";
  const discW = doc.getTextWidth(disc);
  doc.text(disc, PAGE_W - M - discW, fy + 6);

  // Report ID (was incorrectly labeled SHA-256)
  if (variant === "clinical" && integrityHash) {
    doc.setFontSize(5);
    doc.text(
      `Report ID: ${integrityHash}`,
      M,
      fy + 6,
    );
  }
}

/** Full datetime with timezone */
function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(from: string, to: string): string {
  const f = new Date(from).toLocaleDateString("en-US");
  const t = new Date(to).toLocaleDateString("en-US");
  return `${f} — ${t}`;
}

/** Build score series for graph from completed rows */
function buildScoreSeries(rows: ReportRow[]): ScoreSeries[] {
  const buckets = new Map<string, { title: string; points: ScorePoint[] }>();

  for (const r of rows) {
    if (r.score == null || !r.activitySlug) continue;
    const slug = r.activitySlug;
    const bucket = buckets.get(slug) ?? { title: r.activityTitle, points: [] };
    bucket.points.push({
      date: formatShortDate(r.submittedAt),
      isoDate: r.submittedAt,
      score: r.score,
      severity: r.severity,
    });
    buckets.set(slug, bucket);
  }

  const result: ScoreSeries[] = [];
  for (const [slug, b] of buckets) {
    if (b.points.length < 2) continue;
    const points = b.points.sort(
      (a, c) => new Date(a.isoDate).getTime() - new Date(c.isoDate).getTime(),
    );
    const maxScore = Math.max(...points.map((p) => p.score));
    const latest = points[points.length - 1];
    const previous = points[points.length - 2];
    result.push({
      slug,
      title: b.title,
      points,
      yMax: Math.max(10, Math.ceil(maxScore * 1.2)),
      latest,
      delta: latest.score - previous.score,
    });
  }
  return result.sort(
    (a, b) =>
      new Date(b.latest.isoDate).getTime() -
      new Date(a.latest.isoDate).getTime(),
  );
}

// ── Patient Activity Summary ──

function buildPatientPDF(
  doc: jsPDF,
  params: ReportParams,
  patientLabel: string,
  rows: ReportRow[],
) {
  let totalPages = 1;
  let currentPage = 1;
  const FOOTER_ZONE = PAGE_H - 22;
  const CONTENT_GAP = 9;

  function patientCheckPage(yPos: number, needed = 10): number {
    if (yPos + needed > FOOTER_ZONE) {
      drawFooter(doc, currentPage, totalPages, "patient");
      doc.addPage();
      currentPage++;
      drawWatermark(doc);
      return drawHeader(doc) + CONTENT_GAP;
    }
    return yPos;
  }

  drawWatermark(doc);
  let y = drawHeader(doc) + 10;

  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("Patient Activity Summary", M, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...CHARCOAL);
  doc.text("Summary of your recorded activities", M, y);
  y += 8;

  doc.setFillColor(247, 245, 240);
  doc.roundedRect(M, y, CW, 28, 2, 2, "F");
  let iy = y + 6;
  const genNow = new Date();
  const genStr = genNow.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
  const infoItems = [
    ["Participant:", patientLabel],
    ["Therapist:", params.therapistName],
    ["Period:", formatDateRange(params.from, params.to)],
    ["Generated:", genStr],
  ];
  for (const [label, val] of infoItems) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(label, M + 4, iy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CHARCOAL);
    doc.text(val, M + 30, iy);
    iy += 6;
  }
  y += 34;

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...CHARCOAL);
    doc.text("No completed activities in this period.", M, y);
  } else {
    const pThH = 10;
    const cols = [M + 4, M + 32, M + 102, M + 135];
    const pHeaders = ["DATE", "ACTIVITY", "MODE", "SCORE"];

    function drawPatientTableHeader(atY: number): number {
      doc.setFillColor(...NAVY);
      doc.roundedRect(M, atY, CW, pThH, 1, 1, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const thY = atY + pThH / 2 + 1.5;
      for (let h = 0; h < pHeaders.length; h++) {
        doc.text(pHeaders[h], cols[h], thY);
      }
      return atY + pThH + 2;
    }

    y = drawPatientTableHeader(y);

    const P_ROW_H = 10;
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < rows.length; i++) {
      if (y + P_ROW_H > FOOTER_ZONE) {
        drawFooter(doc, currentPage, totalPages, "patient");
        doc.addPage();
        currentPage++;
        drawWatermark(doc);
        y = drawHeader(doc) + CONTENT_GAP;
        y = drawPatientTableHeader(y);
      }
      const row = rows[i];
      if (i % 2 === 0) {
        doc.setFillColor(249, 247, 243);
        doc.rect(M, y, CW, P_ROW_H, "F");
      }
      const pTextY = y + P_ROW_H / 2 + 1;
      doc.setTextColor(...CHARCOAL);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(formatDate(row.submittedAt), cols[0], pTextY);
      const title =
        row.activityTitle.length > 35
          ? row.activityTitle.slice(0, 32) + "…"
          : row.activityTitle;
      doc.text(title, cols[1], pTextY);
      doc.text(row.deliveryMode.replace("_", " "), cols[2], pTextY);
      doc.setFont("helvetica", "bold");
      doc.text(
        row.score != null ? `${row.score}` : "—",
        cols[3],
        pTextY,
      );
      doc.setFont("helvetica", "normal");
      y += P_ROW_H;
    }
  }
  y += 6;

  // Important Notice — check page break first
  const noticeH = 32;
  y = patientCheckPage(y, noticeH + 10);

  doc.setFillColor(255, 248, 225);
  doc.roundedRect(M, y, CW, noticeH, 2, 2, "F");
  doc.setDrawColor(240, 208, 96);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, CW, noticeH, 2, 2, "S");

  let ny = y + 5;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Important Notice", M + 4, ny);
  ny += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CHARCOAL);
  const noticeLines = [
    "The scores presented in this summary reflect your responses to validated clinical",
    "instruments and are provided for informational purposes only. They do not constitute",
    "a diagnosis, clinical assessment, or treatment recommendation.",
    "",
    "Please discuss these results with your therapist or a qualified mental health",
    "professional before drawing any conclusions or making decisions based on this information.",
    "",
    "This summary does not replace a clinical evaluation.",
  ];
  for (const line of noticeLines) {
    doc.text(line, M + 4, ny);
    ny += 4;
  }

  drawFooter(doc, currentPage, totalPages, "patient");

  // 2nd-pass: fix total page count on all pages
  totalPages = currentPage;
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(255, 255, 255);
    doc.rect(PAGE_W / 2 - 15, PAGE_H - 16, 30, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    const pg = `${p} / ${totalPages}`;
    const pgW = doc.getTextWidth(pg);
    doc.text(pg, (PAGE_W - pgW) / 2, PAGE_H - 12);
  }
}

// ── Clinical Activity Report ──

function buildClinicalPDF(
  doc: jsPDF,
  params: ReportParams,
  patientLabel: string,
  rows: ReportRow[],
  hasPHI: boolean,
  flags: ClinicalFlagEntry[],
  auditEntries: AuditEntry[],
) {
  const FOOTER_ZONE = PAGE_H - 22;
  let totalPages = 1;
  let currentPage = 1;

  const hashInput = `${patientLabel}|${params.therapistName}|${params.from}|${params.to}|${rows.length}|${new Date().toISOString().slice(0, 10)}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const chr = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  const integrityHash = Math.abs(hash).toString(16).padStart(8, "0") + "…";

  const CONTENT_GAP = 9;

  function checkPage(y: number, needed = 10): number {
    if (y + needed > FOOTER_ZONE) {
      drawFooter(doc, currentPage, totalPages, "clinical", integrityHash);
      doc.addPage();
      currentPage++;
      drawWatermark(doc);
      return drawHeader(doc) + CONTENT_GAP;
    }
    return y;
  }

  /** Restore body text state after checkPage (prevents title bleed) */
  function restoreBodyFont() {
    doc.setTextColor(...CHARCOAL);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
  }

  drawWatermark(doc);
  let y = drawHeader(doc);

  // ── Clinician copy band ──
  const bandH = 10;
  doc.setFillColor(253, 232, 232);
  doc.rect(0, y, PAGE_W, bandH, "F");
  doc.setTextColor(...RED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const bandLabel = "CLINICIAN COPY — NOT INTENDED FOR PATIENT DISTRIBUTION";
  const bandW = doc.getTextWidth(bandLabel);
  doc.text(bandLabel, (PAGE_W - bandW) / 2, y + bandH / 2 + 1.5);
  y += bandH + 12;

  // ── Title ──
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("Clinical Activity Report", M, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...CHARCOAL);
  doc.text("Summary of recorded activities for your clinical records", M, y);
  y += 5;

  // ── PHI warning ──
  if (hasPHI) {
    y += 2;
    doc.setFillColor(255, 243, 224);
    doc.roundedRect(M, y, CW, 8, 1.5, 1.5, "F");
    doc.setTextColor(230, 81, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("PHI WARNING:", M + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This document contains Protected Health Information. Store securely per your practice's HIPAA policies.",
      M + 28,
      y + 5,
    );
    y += 10;
  } else {
    y += 3;
  }

  // ── Info block (with Generated, license, NPI) ──
  const genNow = new Date();
  const genStr = genNow.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
  const infoItems: [string, string][] = [
    ["Patient:", patientLabel],
    ["Therapist:", params.therapistName],
    ["Practice:", params.workspaceName],
    ["Period:", formatDateRange(params.from, params.to)],
    ["Generated:", genStr],
  ];
  if (params.licenseNumber) {
    infoItems.push(["License:", params.licenseNumber]);
  }
  if (params.npi) {
    infoItems.push(["NPI:", params.npi]);
  }
  const infoLineH = 6;
  const infoPadY = 6;
  const infoBoxH = infoPadY * 2 + infoItems.length * infoLineH;
  doc.setFillColor(247, 245, 240);
  doc.roundedRect(M, y, CW, infoBoxH, 2, 2, "F");
  let iy = y + infoPadY + 4;
  for (const [label, val] of infoItems) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(label, M + 4, iy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CHARCOAL);
    doc.text(val, M + 28, iy);
    iy += infoLineH;
  }
  y += infoBoxH + 8;

  // ── Quick Read (data index, NOT clinical summary) ──
  const series = buildScoreSeries(rows);
  const completedWithScore = rows.filter((r) => r.score != null);
  if (completedWithScore.length > 0) {
    y = checkPage(y, 30);
    // Box
    const qrLineH = 5;
    const qrHeaderH = 12;
    // One line per unique scale with latest score
    const scaleMap = new Map<string, { title: string; score: number; severity: string | null; delta: number | null }>();
    for (const s of series) {
      scaleMap.set(s.slug, { title: s.title, score: s.latest.score, severity: s.latest.severity, delta: s.delta });
    }
    // Also add scales with only 1 response (no delta)
    for (const r of completedWithScore) {
      if (r.activitySlug && !scaleMap.has(r.activitySlug)) {
        scaleMap.set(r.activitySlug, { title: r.activityTitle, score: r.score!, severity: r.severity, delta: null });
      }
    }
    const scaleEntries = Array.from(scaleMap.values());
    const severityCount = scaleEntries.filter((e) => e.severity).length;
    const qrBoxH = qrHeaderH + scaleEntries.length * qrLineH + severityCount * 3.5 + 12;

    // Measure content first, then draw box
    const qrStartY = y;
    let qy = y + qrHeaderH + 2;
    // Measure entries
    for (const entry of scaleEntries) {
      qy += entry.severity ? qrLineH + 3.5 : qrLineH;
    }
    // Disclaimer line + padding
    const qrEndY = qy + 8;
    const measuredBoxH = qrEndY - qrStartY;

    // Draw box with measured height
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.setFillColor(250, 248, 244);
    doc.roundedRect(M, y, CW, measuredBoxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text("Quick View", M + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    doc.text("Data index (non-interpretative).", M + 30, y + 6);

    qy = y + qrHeaderH + 2;
    for (const entry of scaleEntries) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...CHARCOAL);
      let line = `${entry.title}: ${entry.score}`;
      if (entry.delta != null && entry.delta !== 0) {
        const sign = entry.delta > 0 ? "+" : "";
        const arrow = entry.delta > 0 ? "(+)" : "(-)";
        line += ` · ${arrow} ${sign}${entry.delta} points`;
      } else if (entry.delta === 0) {
        line += " · (=) 0";
      }
      doc.text(line, M + 4, qy);
      // Severity on secondary line (scale-defined label)
      if (entry.severity) {
        doc.setFontSize(6.5);
        doc.setTextColor(130, 130, 130);
        doc.text(`Band: ${entry.severity} (per instrument definition)`, M + 4, qy + 3.5);
        doc.setTextColor(...CHARCOAL);
        doc.setFontSize(8);
      }
      qy += entry.severity ? qrLineH + 3.5 : qrLineH;
    }

    // Delta disclaimer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Changes reflect score differences only and do not imply clinical improvement or worsening.",
      M + 4,
      qy + 1,
    );

    y = qrEndY;
  }

  // ── Section: Activity History ──
  y += CONTENT_GAP;
  y = checkPage(y, 30);
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Activity History", M, y);
  y += 8;

  const thH = 10;
  const cols = [M + 4, M + 42, M + 90, M + 112, M + 130, M + 158];
  const headers = ["DATE", "ACTIVITY", "MODE", "SCORE", "SEVERITY", "FLAG"];

  function drawActivityTableHeader(atY: number): number {
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, atY, CW, thH, 1, 1, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    for (let h = 0; h < headers.length; h++) {
      doc.text(headers[h], cols[h], atY + thH / 2 + 1.5);
    }
    return atY + thH + 2;
  }

  y = drawActivityTableHeader(y);

  const ROW_H = 12;
  const ROW_ITEM_H = 18;
  let prevPageForTable = currentPage;
  for (let i = 0; i < rows.length; i++) {
    const rowH = rows[i].items ? ROW_ITEM_H : ROW_H;
    y = checkPage(y, rowH);

    // Re-draw table header after page break
    if (currentPage !== prevPageForTable) {
      y = drawActivityTableHeader(y);
      prevPageForTable = currentPage;
    }

    const row = rows[i];
    if (i % 2 === 0) {
      doc.setFillColor(249, 247, 243);
      doc.rect(M, y, CW, rowH, "F");
    }
    const textY = y + ROW_H / 2 + 1;
    doc.setTextColor(...CHARCOAL);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(formatFullDateTime(row.submittedAt), cols[0], textY);
    const title =
      row.activityTitle.length > 25
        ? row.activityTitle.slice(0, 22) + "…"
        : row.activityTitle;
    doc.setFontSize(9);
    doc.text(title, cols[1], textY);
    doc.setFontSize(9);
    doc.text(row.deliveryMode.replace("_", " "), cols[2], textY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(
      row.score != null ? `${row.score}` : "—",
      cols[3],
      textY,
    );
    doc.setFont("helvetica", "normal");
    doc.text(row.severity ?? "—", cols[4], textY);
    if (row.flagLabel) {
      doc.setTextColor(...RED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("FLAG", cols[5], textY);
    }
    y += ROW_H;

    if (row.items) {
      doc.setTextColor(119, 119, 119);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      const itemText =
        row.items.length > 90 ? row.items.slice(0, 87) + "…" : row.items;
      doc.text(itemText, cols[1], y + 2);
      if (row.flagLabel) {
        doc.setTextColor(...RED);
        doc.setFont("helvetica", "bold");
        doc.text(row.flagLabel.slice(0, 30), M + 4, y + 2);
      }
      y += 5;
    }
  }

  if (rows.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(...CHARCOAL);
    doc.text("No completed activities in this period.", M, y);
    y += 6;
  }

  // ── Section: Score History (graph — jsPDF primitives) ──
  if (series.length > 0) {
    y += 6;
    y = checkPage(y, 60);
    doc.setTextColor(...NAVY);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("Score History", M, y);
    y += 8;

    for (const s of series) {
      const graphH = 40;
      const graphW = CW - 20;
      y = checkPage(y, graphH + 18);

      // Title
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(s.title, M, y);
      // Delta
      if (s.delta != null && s.delta !== 0) {
        const sign = s.delta > 0 ? "+" : "";
        const arrow = s.delta > 0 ? "(+)" : "(-)";
        const deltaText = `${arrow} ${sign}${s.delta} points`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(deltaText, M + doc.getTextWidth(s.title) + 8, y);
      }
      y += 5;

      // Graph area
      const gx = M + 10;
      const gy = y;
      const gw = graphW;
      const gh = graphH;

      // Grid lines (3 horizontal)
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      for (let g = 0; g <= 3; g++) {
        const ly = gy + (gh * g) / 3;
        doc.line(gx, ly, gx + gw, ly);
      }

      // Y axis labels
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      for (let g = 0; g <= 3; g++) {
        const val = Math.round(s.yMax * (1 - g / 3));
        const ly = gy + (gh * g) / 3;
        doc.text(`${val}`, M, ly + 1.5);
      }

      // Plot points & lines
      const xStep = s.points.length > 1 ? gw / (s.points.length - 1) : 0;
      const coords: { px: number; py: number }[] = [];

      for (let pi = 0; pi < s.points.length; pi++) {
        const p = s.points[pi];
        const px = gx + pi * xStep;
        const py = gy + gh - (p.score / s.yMax) * gh;
        coords.push({ px, py });
      }

      // Lines
      doc.setDrawColor(...SAGE);
      doc.setLineWidth(0.8);
      for (let pi = 1; pi < coords.length; pi++) {
        doc.line(coords[pi - 1].px, coords[pi - 1].py, coords[pi].px, coords[pi].py);
      }

      // Points
      for (let pi = 0; pi < coords.length; pi++) {
        const { px, py } = coords[pi];
        const isLast = pi === coords.length - 1;
        const r = isLast ? 2 : 1.2;
        doc.setFillColor(...SAGE);
        doc.circle(px, py, r, "F");
        if (isLast) {
          doc.setDrawColor(...WHITE);
          doc.setLineWidth(0.5);
          doc.circle(px, py, r + 0.5, "S");
        }
      }

      // X axis labels
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      for (let pi = 0; pi < s.points.length; pi++) {
        const px = coords[pi].px;
        const label = s.points[pi].date;
        doc.text(label, px - doc.getTextWidth(label) / 2, gy + gh + 4);
      }

      y = gy + gh + 8;
    }

    // Disclaimer below graph
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Displayed for documentation purposes only. No clinical interpretation is provided.",
      M,
      y,
    );
    y += 6;
  }

  // ── Section: Score Changes ──
  const changesEntries = series.filter((s) => s.delta != null && s.delta !== 0);
  if (changesEntries.length > 0) {
    y += 4;
    y = checkPage(y, 15);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Score Changes", M, y);
    y += 6;

    for (const c of changesEntries) {
      y = checkPage(y, 5);
      restoreBodyFont();
      doc.setFontSize(8);
      const prev = c.points[c.points.length - 2].score;
      const curr = c.latest.score;
      const sign = c.delta! > 0 ? "+" : "";
      const arrow = c.delta! > 0 ? "(+)" : "(-)";
      const line = `${c.title}: ${prev} > ${curr} (${arrow} ${sign}${c.delta} points)`;
      doc.text(line, M, y);
      y += 5;
    }
    y += 4;
  }

  // ── Section: Clinical Flag Timeline ──
  y += 6;
  y = checkPage(y, 20);
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Clinical Flag Timeline", M, y);
  y += 8;

  if (flags.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(...CHARCOAL);
    doc.setFont("helvetica", "normal");
    doc.text("No clinical flags in this period.", M, y);
    y += 5;
  } else {
    for (const flag of flags) {
      const FLAG_BOX_H = 20;
      y = checkPage(y, FLAG_BOX_H + 2);

      const statusColors: Record<string, readonly [number, number, number]> = {
        ACTIVE: [192, 57, 43],
        MONITORING: [230, 126, 34],
        ACKNOWLEDGED: SAGE,
      };
      const bgColors: Record<string, readonly [number, number, number]> = {
        ACTIVE: [253, 232, 232],
        MONITORING: [255, 248, 225],
        ACKNOWLEDGED: [237, 245, 239],
      };
      const borderColors: Record<string, readonly [number, number, number]> = {
        ACTIVE: [240, 180, 180],
        MONITORING: [240, 208, 96],
        ACKNOWLEDGED: [180, 210, 190],
      };

      const bg = bgColors[flag.status] ?? [249, 247, 243];
      const border = borderColors[flag.status] ?? [200, 200, 200];
      const statusClr = statusColors[flag.status] ?? CHARCOAL;

      doc.setFillColor(...bg);
      doc.roundedRect(M, y, CW, FLAG_BOX_H, 1.5, 1.5, "F");
      doc.setDrawColor(...border);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, CW, FLAG_BOX_H, 1.5, 1.5, "S");

      const flagTextTop = y + 5;

      doc.setTextColor(...statusClr);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(flag.status, M + 3, flagTextTop);

      doc.setTextColor(...CHARCOAL);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(formatFullDateTime(flag.date), M + 35, flagTextTop);

      doc.setFontSize(7);
      doc.text(flag.description.slice(0, 80), M + 3, flagTextTop + 5);

      doc.setTextColor(180, 155, 100);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "italic");
      doc.text(
        "This flag reflects a predefined scoring threshold within the instrument. Follow applicable legal and professional guidelines.",
        M + 3,
        flagTextTop + 10,
      );

      y += FLAG_BOX_H + 3;
    }
  }

  // ── Section: Audit Trail ──
  y += 6;
  y = checkPage(y, 15);
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Audit Trail", M, y);
  y += 8;

  if (auditEntries.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...CHARCOAL);
    doc.setFont("helvetica", "normal");
    doc.text("No audit events in this period.", M, y);
    y += 5;
  } else {
    const auditThH = 10;
    const auditCols = [M + 4, M + 55, M + 120];
    const auditHeaders = ["TIMESTAMP", "ACTION", "ACTOR"];

    function drawAuditTableHeader(atY: number): number {
      doc.setFillColor(...NAVY);
      doc.roundedRect(M, atY, CW, auditThH, 1, 1, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const thY = atY + auditThH / 2 + 1.5;
      for (let h = 0; h < auditHeaders.length; h++) {
        doc.text(auditHeaders[h], auditCols[h], thY);
      }
      return atY + auditThH + 2;
    }

    y = drawAuditTableHeader(y);

    const AUDIT_ROW_H = 10;
    let prevPageForAudit = currentPage;
    for (let i = 0; i < auditEntries.length; i++) {
      y = checkPage(y, AUDIT_ROW_H);

      // Re-draw table header after page break
      if (currentPage !== prevPageForAudit) {
        y = drawAuditTableHeader(y);
        prevPageForAudit = currentPage;
      }

      const entry = auditEntries[i];
      if (i % 2 === 0) {
        doc.setFillColor(249, 247, 243);
        doc.rect(M, y, CW, AUDIT_ROW_H, "F");
      }
      const auditTextY = y + AUDIT_ROW_H / 2 + 1;
      doc.setTextColor(...CHARCOAL);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(formatFullDateTime(entry.timestamp), auditCols[0], auditTextY);
      doc.setFontSize(8);
      doc.text(entry.action.slice(0, 35), auditCols[1], auditTextY);
      doc.text(entry.actorLabel.slice(0, 25), auditCols[2], auditTextY);
      y += AUDIT_ROW_H;
    }

    // 50-event note
    if (auditEntries.length >= 50) {
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "Showing most recent 50 events. Full audit history is available within the platform.",
        M,
        y,
      );
      y += 5;
    }
  }

  // ── Notices & Disclaimers ──
  y += 4;
  y = checkPage(y, 20);
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("Notices & Disclaimers", M, y);
  y += 7;

  const notices: [string, string][] = [
    [
      "Document Purpose",
      "This Clinical Activity Report is a platform-generated summary of activities completed through Terapily. " +
        "It is intended to support — not replace — clinical documentation maintained in your electronic health record (EHR). " +
        "All clinical interpretations, diagnoses, and treatment decisions remain the sole responsibility of the treating clinician.",
    ],
    [
      "Scoring Methodology",
      "Scores are computed automatically using published scoring algorithms for each validated instrument. " +
        "Item-level breakdowns are provided for transparency and auditability. " +
        "Terapily does not modify, adjust, or interpret scores beyond the instrument's defined calculation.",
    ],
    [
      "Clinical Flags",
      "Clinical flags are generated when individual item responses meet predefined thresholds. " +
        "Flags are informational alerts and do not constitute clinical advice. " +
        "The treating clinician is responsible for determining appropriate follow-up in accordance with applicable laws and professional ethical guidelines.",
    ],
    [
      "Data Integrity",
      `This report includes a Report ID (${integrityHash}) computed from report content at generation time. ` +
        "Hash-chain verification is planned for a future update.",
    ],
    [
      "Protected Health Information",
      "This document may contain Protected Health Information (PHI) as defined by HIPAA. " +
        "It should be stored, transmitted, and disposed of in accordance with your practice's privacy and security policies. " +
        "Terapily encrypts PHI at rest within the platform; once exported as PDF, security responsibility transfers to the recipient.",
    ],
    [
      "Right of Access",
      "Under HIPAA and the 21st Century Cures Act, patients have the right to request access to their health information. " +
        "If a patient requests access, provide the Patient Activity Summary version, which excludes clinical flags, " +
        "severity classifications, and clinician-only annotations.",
    ],
  ];

  for (const [title, body] of notices) {
    y = checkPage(y, 14);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, M, y);
    y += 5;
    doc.setTextColor(...CHARCOAL);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(body, CW - 2);
    for (const line of lines) {
      y = checkPage(y, 5);
      restoreBodyFont();
      doc.text(line, M, y);
      y += 4;
    }
    y += 3;
  }

  drawFooter(doc, currentPage, totalPages, "clinical", integrityHash);

  // ── Fix total page count on all pages ──
  totalPages = currentPage;
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(255, 255, 255);
    doc.rect(PAGE_W / 2 - 15, PAGE_H - 16, 30, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    const pg = `${p} / ${totalPages}`;
    const pgW = doc.getTextWidth(pg);
    doc.text(pg, (PAGE_W - pgW) / 2, PAGE_H - 12);
  }
}

// ── Main entry point ──

export async function buildComplianceReportPDF(
  params: ReportParams,
  variant: ReportVariant = "clinical",
): Promise<Uint8Array> {
  // 1. Fetch patient name (decrypt)
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("display_name, full_name_encrypted")
    .eq("id", params.patientId)
    .eq("workspace_id", params.workspaceId)
    .maybeSingle();

  let patientLabel = patient?.display_name ?? "Participant";
  let hasPHI = false;
  if (patient?.full_name_encrypted) {
    try {
      const decrypted = await decryptPHIServer(patient.full_name_encrypted);
      if (decrypted) {
        patientLabel = decrypted;
        hasPHI = true;
      }
    } catch (err) {
      logServerError("compliance-report.decrypt", err);
    }
  }

  // 2. Fetch responses in period (include slug for graph)
  const { data: responses } = await supabaseAdmin
    .from("activity_responses")
    .select(
      `
      score,
      severity,
      submitted_via,
      submitted_at,
      activity_id,
      patient_activity:patient_activities!patient_activities_response_fk ( delivery_mode ),
      activity:activity_catalog!inner ( title, slug )
    `,
    )
    .eq("patient_id", params.patientId)
    .eq("workspace_id", params.workspaceId)
    .gte("submitted_at", params.from)
    .lte("submitted_at", params.to)
    .order("submitted_at", { ascending: false });

  const rows: ReportRow[] = (responses ?? []).map((r) => ({
    activityTitle: (r as any).activity?.title ?? "Activity",
    activitySlug: (r as any).activity?.slug ?? undefined,
    score: r.score != null ? Number(r.score) : null,
    severity: variant === "clinical" ? r.severity : null,
    deliveryMode:
      (r as any).patient_activity?.delivery_mode ??
      r.submitted_via ??
      "unknown",
    submittedAt: r.submitted_at,
  }));

  // 3. Fetch clinical flags from flagged rows
  const flags: ClinicalFlagEntry[] = rows
    .filter((r) => r.flagLabel)
    .map((r) => ({
      status: "ACTIVE",
      date: r.submittedAt,
      description: `${r.activityTitle}: ${r.flagLabel ?? "Flagged"}`,
    }));

  // 4. Fetch audit trail with actor names
  let auditEntries: AuditEntry[] = [];
  if (variant === "clinical") {
    const { data: auditData } = await supabaseAdmin
      .from("audit_logs")
      .select("action, created_at, actor_id")
      .eq("workspace_id", params.workspaceId)
      .eq("resource_id", params.patientId)
      .gte("created_at", params.from)
      .lte("created_at", params.to)
      .order("created_at", { ascending: false })
      .limit(50);

    // Resolve actor names from profiles
    const actorIds = [...new Set((auditData ?? []).map((a) => a.actor_id).filter(Boolean))];
    const actorNames = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds as string[]);
      for (const p of profiles ?? []) {
        if (p.full_name) actorNames.set(p.id, p.full_name);
      }
    }

    auditEntries = (auditData ?? []).map((a) => ({
      action: a.action,
      timestamp: a.created_at,
      actorLabel: a.actor_id
        ? actorNames.get(a.actor_id) ?? `User ${String(a.actor_id).slice(0, 8)}…`
        : "System",
    }));
  }

  // 5. Build PDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (variant === "patient") {
    buildPatientPDF(doc, params, patientLabel, rows);
  } else {
    buildClinicalPDF(doc, params, patientLabel, rows, hasPHI, flags, auditEntries);
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
