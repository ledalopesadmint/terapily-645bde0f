import { jsPDF } from "jspdf";
import { readFileSync, writeFileSync } from "fs";

// Load brand assets
const ICON_PATH = "/dev-server/src/features/activities/pdf-brand-assets.server.ts";
const assetSrc = readFileSync(ICON_PATH, "utf-8");

function extractB64(varName: string): string {
  const re = new RegExp(`export const ${varName}\\s*=\\s*"([^"]+)"`);
  const m = assetSrc.match(re);
  if (!m) {
    const re2 = new RegExp(`export const ${varName}\\s*=\\s*\`([^\`]+)\``);
    const m2 = assetSrc.match(re2);
    return m2?.[1] ?? "";
  }
  return m[1];
}

const ICON_PNG_B64 = extractB64("ICON_PNG_B64");
const WATERMARK_PNG_B64 = extractB64("WATERMARK_PNG_B64");

const NAVY = [31, 42, 54] as const;
const CREAM = [244, 239, 230] as const;
const SAGE = [126, 155, 134] as const;
const CHARCOAL = [58, 63, 71] as const;
const WHITE = [255, 255, 255] as const;
const RED = [192, 57, 43] as const;

const M = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CW = PAGE_W - M * 2;

function drawWatermark(doc: jsPDF) {
  const gs = (doc as any).GState;
  if (gs && WATERMARK_PNG_B64) {
    doc.saveGraphicsState();
    doc.setGState(new gs({ opacity: 0.045 }));
    const size = 120;
    doc.addImage(`data:image/png;base64,${WATERMARK_PNG_B64}`, "PNG", (PAGE_W - size) / 2, (PAGE_H - size) / 2, size, size);
    doc.restoreGraphicsState();
  }
}

function drawHeader(doc: jsPDF): number {
  const barH = 18;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, barH, "F");
  if (ICON_PNG_B64) {
    const iconSize = 10;
    const iconY = (barH - iconSize) / 2;
    doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", M, iconY, iconSize, iconSize);
  }
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...CREAM);
  const wmX = M + 13;
  const wmY = barH / 2 + 2;
  doc.text("terapily", wmX, wmY);
  const dotX = wmX + doc.getTextWidth("terapily");
  doc.setTextColor(...SAGE);
  doc.text(".", dotX, wmY);
  return barH;
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, integrityHash?: string) {
  const fy = PAGE_H - 14;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(M, fy - 2, PAGE_W - M, fy - 2);

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  const wmX = M + 6;
  doc.text("terapily", wmX, fy + 2);
  doc.setTextColor(...SAGE);
  doc.text(".", wmX + doc.getTextWidth("terapily"), fy + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CHARCOAL);
  const pg = `${pageNum} / ${totalPages}`;
  const pgW = doc.getTextWidth(pg);
  doc.text(pg, (PAGE_W - pgW) / 2, fy + 2);

  doc.setFontSize(5.5);
  doc.setTextColor(153, 153, 153);
  const disc = "Platform-generated summary. Does not replace clinical documentation in your EHR.";
  const discW = doc.getTextWidth(disc);
  doc.text(disc, PAGE_W - M - discW, fy + 6);

  if (integrityHash) {
    doc.setFontSize(5);
    doc.text(`Report ID: ${integrityHash}`, M, fy + 6);
  }
}

function formatFullDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Sample data
const sampleRows = [
  { title: "PHQ-9", slug: "phq-9", score: 14, severity: "Moderate", mode: "in_session", date: "2026-03-15T10:30:00Z", flag: null, items: "Q1:2 Q2:3 Q3:1 Q4:2 Q5:1 Q6:2 Q7:1 Q8:1 Q9:1" },
  { title: "PHQ-9", slug: "phq-9", score: 11, severity: "Moderate", mode: "in_session", date: "2026-04-01T14:00:00Z", flag: null, items: "Q1:1 Q2:2 Q3:1 Q4:2 Q5:1 Q6:1 Q7:1 Q8:1 Q9:1" },
  { title: "PHQ-9", slug: "phq-9", score: 8, severity: "Mild", mode: "in_session", date: "2026-04-15T09:45:00Z", flag: null, items: "Q1:1 Q2:1 Q3:1 Q4:1 Q5:1 Q6:1 Q7:1 Q8:0 Q9:1" },
  { title: "GAD-7", slug: "gad-7", score: 12, severity: "Moderate", mode: "shared_link", date: "2026-03-20T16:00:00Z", flag: null, items: null },
  { title: "GAD-7", slug: "gad-7", score: 9, severity: "Mild", mode: "in_session", date: "2026-04-10T11:00:00Z", flag: null, items: null },
  { title: "PCL-5", slug: "pcl-5", score: 38, severity: "Above threshold", mode: "in_session", date: "2026-03-25T13:00:00Z", flag: "Item 8 ≥ 3", items: "Cluster B elevated" },
  { title: "PCL-5", slug: "pcl-5", score: 33, severity: "Above threshold", mode: "in_session", date: "2026-04-12T10:00:00Z", flag: null, items: null },
  { title: "C-SSRS Screener", slug: "c-ssrs", score: 2, severity: null, mode: "in_session", date: "2026-04-05T09:00:00Z", flag: "Ideation endorsed", items: null },
];

const sampleFlags = [
  { status: "ACTIVE", date: "2026-04-05T09:00:00Z", description: "C-SSRS Screener: Ideation endorsed (Item 2)" },
  { status: "MONITORING", date: "2026-03-25T13:00:00Z", description: "PCL-5: Item 8 ≥ 3 (re-experiencing cluster)" },
  { status: "ACKNOWLEDGED", date: "2026-03-15T10:30:00Z", description: "PHQ-9: Item 9 ≥ 1 (self-harm screening)" },
];

const sampleAudit = [
  { action: "patient_activity.created", timestamp: "2026-03-15T10:25:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-03-15T10:35:00Z", actor: "System" },
  { action: "patient_activity.created", timestamp: "2026-03-20T15:55:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "magic_link.generated", timestamp: "2026-03-20T15:56:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-03-20T16:10:00Z", actor: "System" },
  { action: "patient_activity.created", timestamp: "2026-03-25T12:50:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-03-25T13:05:00Z", actor: "System" },
  { action: "clinical_flag.triggered", timestamp: "2026-03-25T13:05:00Z", actor: "System" },
  { action: "patient_activity.created", timestamp: "2026-04-01T13:55:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-04-01T14:05:00Z", actor: "System" },
  { action: "patient_activity.created", timestamp: "2026-04-05T08:50:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-04-05T09:05:00Z", actor: "System" },
  { action: "clinical_flag.triggered", timestamp: "2026-04-05T09:05:00Z", actor: "System" },
  { action: "clinical_flag.acknowledged", timestamp: "2026-04-05T09:15:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "patient_activity.created", timestamp: "2026-04-10T10:50:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-04-10T11:05:00Z", actor: "System" },
  { action: "patient_activity.created", timestamp: "2026-04-12T09:50:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-04-12T10:05:00Z", actor: "System" },
  { action: "patient_activity.created", timestamp: "2026-04-15T09:40:00Z", actor: "Dr. Sarah Mitchell" },
  { action: "activity_response.submitted", timestamp: "2026-04-15T09:50:00Z", actor: "System" },
  { action: "report.generated", timestamp: "2026-05-01T12:00:00Z", actor: "Dr. Sarah Mitchell" },
];

// Build
const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const FOOTER_ZONE = PAGE_H - 22;
let totalPages = 1;
let currentPage = 1;
const integrityHash = "a3f8c21e…";
const CONTENT_GAP = 9;

function checkPage(y: number, needed = 10): number {
  if (y + needed > FOOTER_ZONE) {
    drawFooter(doc, currentPage, totalPages, integrityHash);
    doc.addPage();
    currentPage++;
    drawWatermark(doc);
    return drawHeader(doc) + CONTENT_GAP;
  }
  return y;
}

function restoreBodyFont() {
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
}

drawWatermark(doc);
let y = drawHeader(doc);

// Clinician band
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

// Title
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

// PHI warning
y += 2;
doc.setFillColor(255, 243, 224);
doc.roundedRect(M, y, CW, 8, 1.5, 1.5, "F");
doc.setTextColor(230, 81, 0);
doc.setFont("helvetica", "bold");
doc.setFontSize(7);
doc.text("PHI WARNING:", M + 3, y + 5);
doc.setFont("helvetica", "normal");
doc.text("This document contains Protected Health Information. Store securely per your practice's HIPAA policies.", M + 28, y + 5);
y += 10;

// Info block
const genStr = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
const infoItems: [string, string][] = [
  ["Patient:", "Jane D."],
  ["Therapist:", "Dr. Sarah Mitchell"],
  ["Practice:", "Clarity Mental Health"],
  ["Period:", "3/15/2026 — 4/30/2026"],
  ["Generated:", genStr],
  ["License:", "PSY-28491"],
  ["NPI:", "1234567890"],
];
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

// Quick View
interface ScaleEntry { title: string; score: number; severity: string | null; delta: number | null }
const scaleMap = new Map<string, ScaleEntry>();
const slugOrder = ["phq-9", "gad-7", "pcl-5", "c-ssrs"];
// Build series-like data
const seriesData: Record<string, number[]> = {};
for (const r of sampleRows) {
  if (!seriesData[r.slug]) seriesData[r.slug] = [];
  seriesData[r.slug].push(r.score);
}
for (const r of sampleRows) {
  if (!scaleMap.has(r.slug)) {
    const scores = seriesData[r.slug];
    const delta = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : null;
    // Use last row for this slug
    const lastRow = [...sampleRows].reverse().find(x => x.slug === r.slug)!;
    scaleMap.set(r.slug, { title: lastRow.title, score: lastRow.score, severity: lastRow.severity, delta });
  }
}
const scaleEntries = Array.from(scaleMap.values());

y = checkPage(y, 30);
const qrLineH = 5;
const qrHeaderH = 12;
const severityCount = scaleEntries.filter(e => e.severity).length;

const qrStartY = y;
let qy = y + qrHeaderH + 2;
for (const entry of scaleEntries) {
  qy += entry.severity ? qrLineH + 3.5 : qrLineH;
}
const qrEndY = qy + 8;
const measuredBoxH = qrEndY - qrStartY;

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
  if (entry.severity) {
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`Band: ${entry.severity} (per instrument definition)`, M + 4, qy + 3.5);
    doc.setTextColor(...CHARCOAL);
    doc.setFontSize(8);
  }
  qy += entry.severity ? qrLineH + 3.5 : qrLineH;
}

doc.setFont("helvetica", "italic");
doc.setFontSize(5.5);
doc.setTextColor(150, 150, 150);
doc.text("Changes reflect score differences only and do not imply clinical improvement or worsening.", M + 4, qy + 1);

y = qrEndY;

// Activity History
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
let prevPageForTable = currentPage;
for (let i = 0; i < sampleRows.length; i++) {
  const hasItems = !!sampleRows[i].items;
  const rowH = hasItems ? 18 : ROW_H;
  y = checkPage(y, rowH);
  if (currentPage !== prevPageForTable) {
    y = drawActivityTableHeader(y);
    prevPageForTable = currentPage;
  }

  const row = sampleRows[i];
  if (i % 2 === 0) {
    doc.setFillColor(249, 247, 243);
    doc.rect(M, y, CW, rowH, "F");
  }
  const textY = y + ROW_H / 2 + 1;
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(formatFullDateTime(row.date), cols[0], textY);
  doc.setFontSize(9);
  doc.text(row.title, cols[1], textY);
  doc.text(row.mode.replace("_", " "), cols[2], textY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${row.score}`, cols[3], textY);
  doc.setFont("helvetica", "normal");
  doc.text(row.severity ?? "—", cols[4], textY);
  if (row.flag) {
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
    doc.text(row.items, cols[1], y + 2);
    if (row.flag) {
      doc.setTextColor(...RED);
      doc.setFont("helvetica", "bold");
      doc.text(row.flag.slice(0, 30), M + 4, y + 2);
    }
    y += 5;
  }
}

// Score History graphs
y += 6;
y = checkPage(y, 60);
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Score History", M, y);
y += 8;

const graphSeries = [
  { title: "PHQ-9", points: [{ d: "Mar 15", s: 14 }, { d: "Apr 1", s: 11 }, { d: "Apr 15", s: 8 }], yMax: 20, delta: -3 },
  { title: "GAD-7", points: [{ d: "Mar 20", s: 12 }, { d: "Apr 10", s: 9 }], yMax: 15, delta: -3 },
  { title: "PCL-5", points: [{ d: "Mar 25", s: 38 }, { d: "Apr 12", s: 33 }], yMax: 50, delta: -5 },
];

for (const s of graphSeries) {
  const graphH = 40;
  const graphW = CW - 20;
  y = checkPage(y, graphH + 18);

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(s.title, M, y);
  if (s.delta !== 0) {
    const sign = s.delta > 0 ? "+" : "";
    const arrow = s.delta > 0 ? "(+)" : "(-)";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${arrow} ${sign}${s.delta} points`, M + doc.getTextWidth(s.title) + 8, y);
  }
  y += 5;

  const gx = M + 10;
  const gy = y;
  const gw = graphW;
  const gh = graphH;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  for (let g = 0; g <= 3; g++) {
    const ly = gy + (gh * g) / 3;
    doc.line(gx, ly, gx + gw, ly);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  for (let g = 0; g <= 3; g++) {
    const val = Math.round(s.yMax * (1 - g / 3));
    const ly = gy + (gh * g) / 3;
    doc.text(`${val}`, M, ly + 1.5);
  }

  const xStep = s.points.length > 1 ? gw / (s.points.length - 1) : 0;
  const coords: { px: number; py: number }[] = [];
  for (let pi = 0; pi < s.points.length; pi++) {
    const px = gx + pi * xStep;
    const py = gy + gh - (s.points[pi].s / s.yMax) * gh;
    coords.push({ px, py });
  }

  doc.setDrawColor(...SAGE);
  doc.setLineWidth(0.8);
  for (let pi = 1; pi < coords.length; pi++) {
    doc.line(coords[pi - 1].px, coords[pi - 1].py, coords[pi].px, coords[pi].py);
  }

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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  for (let pi = 0; pi < s.points.length; pi++) {
    const label = s.points[pi].d;
    doc.text(label, coords[pi].px - doc.getTextWidth(label) / 2, gy + gh + 4);
  }

  y = gy + gh + 8;
}

doc.setFont("helvetica", "italic");
doc.setFontSize(6);
doc.setTextColor(150, 150, 150);
doc.text("Displayed for documentation purposes only. No clinical interpretation is provided.", M, y);
y += 6;

// Score Changes
y += 4;
y = checkPage(y, 15);
doc.setTextColor(...NAVY);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("Score Changes", M, y);
y += 6;

const changes = [
  { title: "PHQ-9", prev: 11, curr: 8, delta: -3 },
  { title: "GAD-7", prev: 12, curr: 9, delta: -3 },
  { title: "PCL-5", prev: 38, curr: 33, delta: -5 },
];
for (const c of changes) {
  y = checkPage(y, 5);
  restoreBodyFont();
  doc.setFontSize(8);
  const sign = c.delta > 0 ? "+" : "";
  const arrow = c.delta > 0 ? "(+)" : "(-)";
  doc.text(`${c.title}: ${c.prev} > ${c.curr} (${arrow} ${sign}${c.delta} points)`, M, y);
  y += 5;
}
y += 4;

// Clinical Flag Timeline
y += 6;
y = checkPage(y, 20);
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Clinical Flag Timeline", M, y);
y += 8;

const statusColors: Record<string, readonly [number, number, number]> = {
  ACTIVE: [192, 57, 43], MONITORING: [230, 126, 34], ACKNOWLEDGED: SAGE,
};
const bgColors: Record<string, readonly [number, number, number]> = {
  ACTIVE: [253, 232, 232], MONITORING: [255, 248, 225], ACKNOWLEDGED: [237, 245, 239],
};
const borderColors: Record<string, readonly [number, number, number]> = {
  ACTIVE: [240, 180, 180], MONITORING: [240, 208, 96], ACKNOWLEDGED: [180, 210, 190],
};

for (const flag of sampleFlags) {
  const FLAG_BOX_H = 20;
  y = checkPage(y, FLAG_BOX_H + 2);
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
  doc.text("This flag reflects a predefined scoring threshold within the instrument. Follow applicable legal and professional guidelines.", M + 3, flagTextTop + 10);

  y += FLAG_BOX_H + 3;
}

// Audit Trail
y += 6;
y = checkPage(y, 15);
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Audit Trail", M, y);
y += 8;

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
for (let i = 0; i < sampleAudit.length; i++) {
  y = checkPage(y, AUDIT_ROW_H);
  if (currentPage !== prevPageForAudit) {
    y = drawAuditTableHeader(y);
    prevPageForAudit = currentPage;
  }
  const entry = sampleAudit[i];
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
  doc.text(entry.actor.slice(0, 25), auditCols[2], auditTextY);
  y += AUDIT_ROW_H;
}

// Notices & Disclaimers
y += 4;
y = checkPage(y, 20);
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(14);
doc.text("Notices & Disclaimers", M, y);
y += 7;

const notices: [string, string][] = [
  ["Document Purpose", "This Clinical Activity Report is a platform-generated summary of activities completed through Terapily. It is intended to support — not replace — clinical documentation maintained in your electronic health record (EHR). All clinical interpretations, diagnoses, and treatment decisions remain the sole responsibility of the treating clinician."],
  ["Scoring Methodology", "Scores are computed automatically using published scoring algorithms for each validated instrument. Item-level breakdowns are provided for transparency and auditability. Terapily does not modify, adjust, or interpret scores beyond the instrument's defined calculation."],
  ["Clinical Flags", "Clinical flags are generated when individual item responses meet predefined thresholds. Flags are informational alerts and do not constitute clinical advice. The treating clinician is responsible for determining appropriate follow-up in accordance with applicable laws and professional ethical guidelines."],
  ["Data Integrity", `This report includes a Report ID (${integrityHash}) computed from report content at generation time. Hash-chain verification is planned for a future update.`],
  ["Protected Health Information", "This document may contain Protected Health Information (PHI) as defined by HIPAA. It should be stored, transmitted, and disposed of in accordance with your practice's privacy and security policies. Terapily encrypts PHI at rest within the platform; once exported as PDF, security responsibility transfers to the recipient."],
  ["Right of Access", "Under HIPAA and the 21st Century Cures Act, patients have the right to request access to their health information. If a patient requests access, provide the Patient Activity Summary version, which excludes clinical flags, severity classifications, and clinician-only annotations."],
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

drawFooter(doc, currentPage, totalPages, integrityHash);

// Fix page count
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

const buf = doc.output("arraybuffer");
writeFileSync("/mnt/documents/clinical-activity-report-v10.pdf", Buffer.from(buf));
console.log("Done! Pages:", pageCount);
