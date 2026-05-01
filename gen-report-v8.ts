import { jsPDF } from "jspdf";
import { writeFileSync } from "fs";
import { ICON_PNG_B64, WATERMARK_PNG_B64 } from "/dev-server/src/features/activities/pdf-brand-assets.server";

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
  if (gs) {
    doc.saveGraphicsState();
    doc.setGState(new gs({ opacity: 0.045 }));
    const size = 120;
    doc.addImage(`data:image/png;base64,${WATERMARK_PNG_B64}`, "PNG", (PAGE_W - size) / 2, (PAGE_H - size) / 2, size, size);
    doc.restoreGraphicsState();
  }
}

function drawHeader(doc: jsPDF) {
  const barH = 18;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, barH, "F");
  const iconSize = 10;
  const iconY = (barH - iconSize) / 2;
  doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", M, iconY, iconSize, iconSize);
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

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, integrityHash?: string) {
  const fy = PAGE_H - 14;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(M, fy - 2, PAGE_W - M, fy - 2);
  const iconS = 4;
  doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", M, fy - 0.5, iconS, iconS);
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  const wmX = M + iconS + 1.5;
  doc.text("terapily", wmX, fy + 2);
  doc.setTextColor(...SAGE);
  doc.text(".", wmX + doc.getTextWidth("terapily."), fy + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...CHARCOAL);
  doc.text(`· ${new Date().getFullYear()}`, wmX + doc.getTextWidth("terapily.") + 2, fy + 2);
  doc.setFontSize(7);
  const pg = `${pageNum} / ${totalPages}`;
  doc.text(pg, (PAGE_W - doc.getTextWidth(pg)) / 2, fy + 2);
  doc.setFontSize(5.5);
  doc.setTextColor(153, 153, 153);
  const disc = "Platform-generated summary. Does not replace clinical documentation in your EHR.";
  doc.text(disc, PAGE_W - M - doc.getTextWidth(disc), fy + 6);
  if (integrityHash) {
    doc.setFontSize(5);
    doc.text(`Report ID: ${integrityHash}`, M, fy + 6);
  }
}

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const integrityHash = "a3f8c1e2…";

drawWatermark(doc);
let y = drawHeader(doc);

// Clinician copy band
const bandH = 10;
doc.setFillColor(253, 232, 232);
doc.rect(0, y, PAGE_W, bandH, "F");
doc.setTextColor(...RED);
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
const bandLabel = "CLINICIAN COPY — NOT INTENDED FOR PATIENT DISTRIBUTION";
doc.text(bandLabel, (PAGE_W - doc.getTextWidth(bandLabel)) / 2, y + bandH / 2 + 1.5);
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
const genStr = "May 1, 2026, 04:30 PM UTC";
const infoItems: [string, string][] = [
  ["Patient:", "Jane D. (JD)"],
  ["Therapist:", "Dr. Sarah Mitchell, LCSW"],
  ["Practice:", "Clarity Behavioral Health"],
  ["Period:", "3/1/2026 — 5/1/2026"],
  ["Generated:", genStr],
  ["License:", "LCSW-48291"],
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

// Quick Read
const scaleEntries = [
  { title: "PHQ-9", score: 14, severity: "Moderate", delta: -3 },
  { title: "GAD-7", score: 10, severity: "Moderate", delta: +2 },
  { title: "PCL-5", score: 38, severity: "Above threshold", delta: -5 },
];
const qrLineH = 5;
const qrHeaderH = 12;
const qrBoxH = qrHeaderH + scaleEntries.length * qrLineH + 6;
doc.setDrawColor(...NAVY);
doc.setLineWidth(0.5);
doc.setFillColor(250, 248, 244);
doc.roundedRect(M, y, CW, qrBoxH, 2, 2, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(...NAVY);
doc.text("Quick Read", M + 4, y + 6);
doc.setFont("helvetica", "normal");
doc.setFontSize(7);
doc.setTextColor(...CHARCOAL);
doc.text("Data index — not a clinical summary.", M + 30, y + 6);
let qy = y + qrHeaderH + 2;
for (const entry of scaleEntries) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CHARCOAL);
  let line = `${entry.title}: ${entry.score}`;
  if (entry.severity) line += ` (${entry.severity})`;
  if (entry.delta !== 0) {
    const sign = entry.delta > 0 ? "+" : "";
    const arrow = entry.delta > 0 ? "(+)" : "(-)";
    line += ` · ${arrow} ${sign}${entry.delta} points`;
  }
  doc.text(line, M + 4, qy);
  qy += qrLineH;
}
y += qrBoxH + 6;

// Activity History
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
y += 4;
doc.text("Activity History", M, y);
y += 8;

const thH = 10;
doc.setFillColor(...NAVY);
doc.roundedRect(M, y, CW, thH, 1, 1, "F");
const cols = [M + 4, M + 28, M + 84, M + 108, M + 126, M + 155];
doc.setTextColor(...WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(7);
const headers = ["DATE", "ACTIVITY", "MODE", "SCORE", "SEVERITY", "FLAG"];
const thTextY = y + thH / 2 + 1.5;
for (let i = 0; i < headers.length; i++) doc.text(headers[i], cols[i], thTextY);
y += thH + 2;

const sampleRows = [
  { date: "Apr 28, 2026, 02:15 PM UTC", title: "PHQ-9", mode: "in session", score: "14", severity: "Moderate", flag: false },
  { date: "Apr 21, 2026, 10:30 AM UTC", title: "PHQ-9", mode: "shared link", score: "17", severity: "Mod. Severe", flag: true },
  { date: "Apr 14, 2026, 03:45 PM UTC", title: "GAD-7", mode: "in session", score: "10", severity: "Moderate", flag: false },
  { date: "Apr 7, 2026, 11:00 AM UTC", title: "GAD-7", mode: "shared link", score: "8", severity: "Mild", flag: false },
  { date: "Mar 28, 2026, 09:30 AM UTC", title: "PCL-5", mode: "in session", score: "38", severity: "Above threshold", flag: true },
  { date: "Mar 14, 2026, 02:00 PM UTC", title: "PCL-5", mode: "in session", score: "43", severity: "Above threshold", flag: true },
];

const ROW_H = 12;
for (let i = 0; i < sampleRows.length; i++) {
  const row = sampleRows[i];
  if (i % 2 === 0) {
    doc.setFillColor(249, 247, 243);
    doc.rect(M, y, CW, ROW_H, "F");
  }
  const textY = y + ROW_H / 2 + 1;
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(row.date, cols[0], textY);
  doc.setFontSize(9);
  doc.text(row.title, cols[1], textY);
  doc.text(row.mode, cols[2], textY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(row.score, cols[3], textY);
  doc.setFont("helvetica", "normal");
  doc.text(row.severity, cols[4], textY);
  if (row.flag) {
    doc.setTextColor(...RED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("FLAG", cols[5], textY);
  }
  y += ROW_H;
}

// Score History graph
y += 10;
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Score History", M, y);
y += 8;

const seriesData = [
  { title: "PHQ-9", points: [{ date: "Mar 14", score: 20 }, { date: "Mar 28", score: 18 }, { date: "Apr 14", score: 17 }, { date: "Apr 28", score: 14 }], yMax: 27, delta: -3 },
  { title: "GAD-7", points: [{ date: "Mar 14", score: 6 }, { date: "Mar 28", score: 7 }, { date: "Apr 7", score: 8 }, { date: "Apr 14", score: 10 }], yMax: 13, delta: +2 },
];

for (const s of seriesData) {
  const graphH = 40;
  const graphW = CW - 20;

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
    const p = s.points[pi];
    coords.push({ px: gx + pi * xStep, py: gy + gh - (p.score / s.yMax) * gh });
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
    const label = s.points[pi].date;
    doc.text(label, coords[pi].px - doc.getTextWidth(label) / 2, gy + gh + 4);
  }

  // Score labels on points
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  for (let pi = 0; pi < s.points.length; pi++) {
    const label = `${s.points[pi].score}`;
    doc.text(label, coords[pi].px - doc.getTextWidth(label) / 2, coords[pi].py - 3);
  }

  y = gy + gh + 10;
}

doc.setFont("helvetica", "italic");
doc.setFontSize(6);
doc.setTextColor(150, 150, 150);
doc.text("Displayed for documentation purposes only. No clinical interpretation is provided.", M, y);
y += 6;

// Significant Changes
const changesEntries = [
  { title: "PHQ-9", prev: 17, curr: 14, delta: -3 },
  { title: "GAD-7", prev: 8, curr: 10, delta: +2 },
  { title: "PCL-5", prev: 43, curr: 38, delta: -5 },
];
y += 4;
doc.setTextColor(...NAVY);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("Significant Changes", M, y);
y += 6;
for (const c of changesEntries) {
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const sign = c.delta > 0 ? "+" : "";
  const arrow = c.delta > 0 ? "(+)" : "(-)";
  doc.text(`${c.title}: ${c.prev} > ${c.curr} (${arrow} ${sign}${c.delta} points)`, M, y);
  y += 5;
}

// Page 2 - Clinical Flags + Audit + Notices
doc.addPage();
drawWatermark(doc);
let y2 = drawHeader(doc) + 9;

// Clinical Flag Timeline
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Clinical Flag Timeline", M, y2);
y2 += 8;

const flags = [
  { status: "ACTIVE", date: "Apr 21, 2026, 10:30 AM UTC", description: "PHQ-9: Item 9 score >= 1 (suicidal ideation screening)" },
  { status: "MONITORING", date: "Mar 28, 2026, 09:30 AM UTC", description: "PCL-5: Total score 38 (above clinical threshold of 33)" },
  { status: "ACKNOWLEDGED", date: "Mar 14, 2026, 02:00 PM UTC", description: "PCL-5: Total score 43 (above clinical threshold of 33)" },
];

for (const flag of flags) {
  const FLAG_BOX_H = 20;
  const statusColors: Record<string, readonly [number, number, number]> = {
    ACTIVE: [192, 57, 43], MONITORING: [230, 126, 34], ACKNOWLEDGED: SAGE,
  };
  const bgColors: Record<string, readonly [number, number, number]> = {
    ACTIVE: [253, 232, 232], MONITORING: [255, 248, 225], ACKNOWLEDGED: [237, 245, 239],
  };
  const borderColors: Record<string, readonly [number, number, number]> = {
    ACTIVE: [240, 180, 180], MONITORING: [240, 208, 96], ACKNOWLEDGED: [180, 210, 190],
  };
  doc.setFillColor(...(bgColors[flag.status] ?? [249, 247, 243]));
  doc.roundedRect(M, y2, CW, FLAG_BOX_H, 1.5, 1.5, "F");
  doc.setDrawColor(...(borderColors[flag.status] ?? [200, 200, 200]));
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y2, CW, FLAG_BOX_H, 1.5, 1.5, "S");
  const ft = y2 + 5;
  doc.setTextColor(...(statusColors[flag.status] ?? CHARCOAL));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(flag.status, M + 3, ft);
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(flag.date, M + 35, ft);
  doc.setFontSize(7);
  doc.text(flag.description, M + 3, ft + 5);
  doc.setTextColor(180, 155, 100);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "italic");
  doc.text("This flag may require clinical follow-up. Consult your jurisdiction's applicable laws and your professional ethical guidelines.", M + 3, ft + 10);
  y2 += FLAG_BOX_H + 3;
}

// Audit Trail
y2 += 6;
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Audit Trail", M, y2);
y2 += 8;

const auditThH = 10;
doc.setFillColor(...NAVY);
doc.roundedRect(M, y2, CW, auditThH, 1, 1, "F");
doc.setTextColor(...WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
doc.text("TIMESTAMP", M + 4, y2 + auditThH / 2 + 1.5);
doc.text("ACTION", M + 55, y2 + auditThH / 2 + 1.5);
doc.text("ACTOR", M + 120, y2 + auditThH / 2 + 1.5);
y2 += auditThH + 2;

const auditRows = [
  { ts: "Apr 28, 2026, 02:15 PM UTC", action: "activity_response.submitted", actor: "Dr. Sarah Mitchell" },
  { ts: "Apr 21, 2026, 10:30 AM UTC", action: "activity_response.submitted", actor: "Patient (magic link)" },
  { ts: "Apr 21, 2026, 10:00 AM UTC", action: "patient_activity.created", actor: "Dr. Sarah Mitchell" },
  { ts: "Apr 14, 2026, 03:45 PM UTC", action: "activity_response.submitted", actor: "Dr. Sarah Mitchell" },
  { ts: "Mar 28, 2026, 09:30 AM UTC", action: "activity_response.submitted", actor: "Dr. Sarah Mitchell" },
  { ts: "Mar 14, 2026, 02:00 PM UTC", action: "activity_response.submitted", actor: "Dr. Sarah Mitchell" },
];

const AUDIT_ROW_H = 10;
for (let i = 0; i < auditRows.length; i++) {
  const entry = auditRows[i];
  if (i % 2 === 0) {
    doc.setFillColor(249, 247, 243);
    doc.rect(M, y2, CW, AUDIT_ROW_H, "F");
  }
  const atY = y2 + AUDIT_ROW_H / 2 + 1;
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(entry.ts, M + 4, atY);
  doc.setFontSize(8);
  doc.text(entry.action, M + 55, atY);
  doc.text(entry.actor, M + 120, atY);
  y2 += AUDIT_ROW_H;
}

// Notices
y2 += 8;
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(14);
doc.text("Notices & Disclaimers", M, y2);
y2 += 7;

const notices: [string, string][] = [
  ["Document Purpose", "This Clinical Activity Report is a platform-generated summary of activities completed through Terapily. It is intended to support — not replace — clinical documentation maintained in your electronic health record (EHR). All clinical interpretations, diagnoses, and treatment decisions remain the sole responsibility of the treating clinician."],
  ["Scoring Methodology", "Scores are computed automatically using published scoring algorithms for each validated instrument. Item-level breakdowns are provided for transparency and auditability. Terapily does not modify, adjust, or interpret scores beyond the instrument's defined calculation."],
  ["Clinical Flags", "Clinical flags are generated when individual item responses meet predefined thresholds. Flags are informational alerts and do not constitute clinical advice. The treating clinician is responsible for determining appropriate follow-up in accordance with applicable laws and professional ethical guidelines."],
  ["Data Integrity", `This report includes a Report ID (${integrityHash}) computed from report content at generation time. Full hash-chain verification will be available in a future platform update.`],
  ["Protected Health Information", "This document may contain Protected Health Information (PHI) as defined by HIPAA. It should be stored, transmitted, and disposed of in accordance with your practice's privacy and security policies. Terapily encrypts PHI at rest within the platform; once exported as PDF, security responsibility transfers to the recipient."],
  ["Right of Access", "Under HIPAA and the 21st Century Cures Act, patients have the right to request access to their health information. If a patient requests access, provide the Patient Activity Summary version, which excludes clinical flags, severity classifications, and clinician-only annotations."],
];

for (const [title, body] of notices) {
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, M, y2);
  y2 += 5;
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(body, CW - 2);
  for (const line of lines) {
    if (y2 > PAGE_H - 22) {
      drawFooter(doc, 2, 3, integrityHash);
      doc.addPage();
      drawWatermark(doc);
      y2 = drawHeader(doc) + 9;
    }
    doc.text(line, M, y2);
    y2 += 4;
  }
  y2 += 3;
}

// Fix footers
const pageCount = (doc as any).internal.getNumberOfPages();
for (let p = 1; p <= pageCount; p++) {
  doc.setPage(p);
  drawFooter(doc, p, pageCount, integrityHash);
}

const buf = doc.output("arraybuffer");
writeFileSync("/mnt/documents/clinical-activity-report-v8-corrected.pdf", Buffer.from(buf));
console.log("PDF generated:", pageCount, "pages");
