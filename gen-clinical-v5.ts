import { jsPDF } from "jspdf";
import { writeFileSync } from "fs";

// Read brand assets
const assetsPath = "/dev-server/src/features/activities/pdf-brand-assets.server.ts";
const assetsContent = require("fs").readFileSync(assetsPath, "utf8");
const iconMatch = assetsContent.match(/export const ICON_PNG_B64 = "([^"]+)"/);
const wmMatch = assetsContent.match(/export const WATERMARK_PNG_B64 = "([^"]+)"/);
const ICON_PNG_B64 = iconMatch![1];
const WATERMARK_PNG_B64 = wmMatch![1];

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

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, integrityHash: string) {
  const fy = PAGE_H - 14;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(M, fy - 2, PAGE_W - M, fy - 2);
  const iconS = 4;
  doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", M, fy - 0.5, iconS, iconS);
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  const fwmX = M + iconS + 1.5;
  doc.text("terapily", fwmX, fy + 2);
  doc.setTextColor(...SAGE);
  doc.text(".", fwmX + doc.getTextWidth("terapily"), fy + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...CHARCOAL);
  doc.text(`· ${new Date().getFullYear()}`, fwmX + doc.getTextWidth("terapily.") + 2, fy + 2);
  doc.setFontSize(7);
  const pg = `${pageNum} / ${totalPages}`;
  doc.text(pg, (PAGE_W - doc.getTextWidth(pg)) / 2, fy + 2);
  doc.setFontSize(5.5);
  doc.setTextColor(153, 153, 153);
  const disc = "Platform-generated summary. Does not replace clinical documentation in your EHR.";
  doc.text(disc, PAGE_W - M - doc.getTextWidth(disc), fy + 6);
  doc.setFontSize(5);
  doc.setTextColor(...CHARCOAL);
  doc.text(`Integrity: SHA-256 ${integrityHash}`, M, fy + 6);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const FOOTER_ZONE = PAGE_H - 22;
const integrityHash = "a3f8c1d2…";
let totalPages = 1;
let currentPage = 1;

function checkPage(y: number, needed = 10): number {
  if (y + needed > FOOTER_ZONE) {
    drawFooter(doc, currentPage, totalPages, integrityHash);
    doc.addPage();
    currentPage++;
    drawWatermark(doc);
    return drawHeader(doc);
  }
  return y;
}

drawWatermark(doc);
let y = drawHeader(doc);

// Band — FULL WIDTH
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

// Info block — centered content with proper padding
const infoItems = [
  ["Patient:", "Jane D."],
  ["Therapist:", "Dr. Sarah Mitchell"],
  ["Practice:", "Your Practice Name"],
  ["Period:", "01/01/2026 — 04/30/2026"],
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

// Activity History title — 50% more padding
y += 4;
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Activity History", M, y);
y += 8;

// Table header
const thH = 10;
doc.setFillColor(...NAVY);
doc.roundedRect(M, y, CW, thH, 1, 1, "F");
const cols = [M + 4, M + 28, M + 84, M + 108, M + 126, M + 155];
doc.setTextColor(...WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(7);
const headers = ["DATE", "ACTIVITY", "MODE", "SCORE", "SEVERITY", "FLAG"];
const thTextY = y + thH / 2 + 1.5;
for (let i = 0; i < headers.length; i++) {
  doc.text(headers[i], cols[i], thTextY);
}
y += thH + 2;

// Sample rows
const sampleRows = [
  { date: "2026-04-28", title: "PHQ-9", mode: "in session", score: "18", severity: "Moderate-Severe", flag: "FLAG" },
  { date: "2026-04-21", title: "GAD-7", mode: "shared link", score: "12", severity: "Moderate", flag: null },
  { date: "2026-04-14", title: "PCL-5", mode: "in session", score: "42", severity: "Above threshold", flag: "FLAG" },
  { date: "2026-04-07", title: "PHQ-9", mode: "shared link", score: "14", severity: "Moderate", flag: null },
  { date: "2026-03-28", title: "C-SSRS Screener", mode: "in session", score: "2", severity: "Low", flag: "FLAG" },
  { date: "2026-03-21", title: "GAD-7", mode: "in session", score: "8", severity: "Mild", flag: null },
  { date: "2026-03-14", title: "PHQ-9", mode: "shared link", score: "10", severity: "Moderate", flag: null },
  { date: "2026-03-07", title: "PCL-5", mode: "in session", score: "38", severity: "Above threshold", flag: null },
];

const ROW_H = 12;
for (let i = 0; i < sampleRows.length; i++) {
  y = checkPage(y, ROW_H);
  const row = sampleRows[i];
  if (i % 2 === 0) {
    doc.setFillColor(249, 247, 243);
    doc.rect(M, y, CW, ROW_H, "F");
  }
  const textY = y + ROW_H / 2 + 1;
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(formatDate(row.date), cols[0], textY);
  doc.text(row.title, cols[1], textY);
  doc.setFontSize(9);
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

// Clinical Flag Timeline — with MONITORING flag
y += 6;
y = checkPage(y, 20);
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Clinical Flag Timeline", M, y);
y += 8;

const flagData = [
  { status: "ACTIVE", date: "2026-04-28", desc: "PHQ-9: Score 18 — Item 9 (suicidal ideation) endorsed at level 2." },
  { status: "MONITORING", date: "2026-04-14", desc: "PCL-5: Score 42 — Above clinical threshold (33). Reassessment in 2 weeks." },
  { status: "ACKNOWLEDGED", date: "2026-03-28", desc: "C-SSRS Screener: Item 1 endorsed — Safety plan reviewed, no active intent." },
];

const statusColors: Record<string, readonly [number, number, number]> = {
  ACTIVE: [192, 57, 43], MONITORING: [230, 126, 34], ACKNOWLEDGED: SAGE,
};
const bgColors: Record<string, readonly [number, number, number]> = {
  ACTIVE: [253, 232, 232], MONITORING: [255, 248, 225], ACKNOWLEDGED: [237, 245, 239],
};
const borderColors: Record<string, readonly [number, number, number]> = {
  ACTIVE: [240, 180, 180], MONITORING: [240, 208, 96], ACKNOWLEDGED: [180, 210, 190],
};

for (const flag of flagData) {
  y = checkPage(y, 16);
  doc.setFillColor(...(bgColors[flag.status] ?? [249, 247, 243]));
  doc.roundedRect(M, y - 2, CW, 14, 1.5, 1.5, "F");
  doc.setDrawColor(...(borderColors[flag.status] ?? [200, 200, 200]));
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y - 2, CW, 14, 1.5, 1.5, "S");
  doc.setTextColor(...(statusColors[flag.status] ?? CHARCOAL));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(flag.status, M + 3, y + 3);
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(formatDate(flag.date), M + 38, y + 3);
  doc.setFontSize(7);
  doc.text(flag.desc.slice(0, 90), M + 3, y + 8);
  doc.setTextColor(180, 155, 100);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "italic");
  doc.text("This flag may require clinical follow-up. Consult your jurisdiction's applicable laws and your professional ethical guidelines.", M + 3, y + 11.5);
  y += 16;
}

// Audit Trail — longer list
y += 6;
y = checkPage(y, 15);
doc.setTextColor(...NAVY);
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.text("Audit Trail", M, y);
y += 8;

const auditThH = 10;
doc.setFillColor(...NAVY);
doc.roundedRect(M, y, CW, auditThH, 1, 1, "F");
doc.setTextColor(...WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
const auditThTextY = y + auditThH / 2 + 1.5;
doc.text("TIMESTAMP", M + 4, auditThTextY);
doc.text("ACTION", M + 45, auditThTextY);
doc.text("ACTOR", M + 120, auditThTextY);
y += auditThH + 2;

const auditRows = [
  { ts: "2026-04-28", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-04-28", action: "score.computed", actor: "System" },
  { ts: "2026-04-28", action: "clinical_flag.created (PHQ-9 item 9)", actor: "System" },
  { ts: "2026-04-21", action: "magic_link.created", actor: "User a3f8c1d2" },
  { ts: "2026-04-21", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-04-21", action: "score.computed", actor: "System" },
  { ts: "2026-04-14", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-04-14", action: "clinical_flag.created (PCL-5)", actor: "System" },
  { ts: "2026-04-07", action: "magic_link.created", actor: "User a3f8c1d2" },
  { ts: "2026-04-07", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-03-28", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-03-28", action: "clinical_flag.acknowledged", actor: "User a3f8c1d2" },
  { ts: "2026-03-21", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-03-14", action: "magic_link.created", actor: "User a3f8c1d2" },
  { ts: "2026-03-14", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-03-07", action: "activity.submitted", actor: "Patient" },
  { ts: "2026-03-07", action: "score.computed", actor: "System" },
  { ts: "2026-01-15", action: "patient.created", actor: "User a3f8c1d2" },
  { ts: "2026-01-15", action: "patient_activity.assigned (PHQ-9)", actor: "User a3f8c1d2" },
  { ts: "2026-01-01", action: "report.generated", actor: "System" },
];

const AUDIT_ROW_H = 10;
for (let i = 0; i < auditRows.length; i++) {
  y = checkPage(y, AUDIT_ROW_H);
  const entry = auditRows[i];
  if (i % 2 === 0) {
    doc.setFillColor(249, 247, 243);
    doc.rect(M, y, CW, AUDIT_ROW_H, "F");
  }
  const auditTextY = y + AUDIT_ROW_H / 2 + 1;
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(formatDate(entry.ts), M + 4, auditTextY);
  doc.text(entry.action.slice(0, 40), M + 45, auditTextY);
  doc.text(entry.actor.slice(0, 25), M + 120, auditTextY);
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
  ["Data Integrity", `This report includes an integrity hash (${integrityHash}) computed from report content at generation time. Full hash-chain verification will be available in a future platform update.`],
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
    doc.text(line, M, y);
    y += 4;
  }
  y += 3;
}

drawFooter(doc, currentPage, totalPages, integrityHash);

// Fix page counts
totalPages = currentPage;
const pageCount = (doc as any).internal.getNumberOfPages();
for (let p = 1; p <= pageCount; p++) {
  doc.setPage(p);
  doc.setFillColor(255, 255, 255);
  doc.rect(PAGE_W / 2 - 15, PAGE_H - 16, 30, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CHARCOAL);
  const pgText = `${p} / ${totalPages}`;
  doc.text(pgText, (PAGE_W - doc.getTextWidth(pgText)) / 2, PAGE_H - 12);
}

const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync("/mnt/documents/clinical-activity-report-v5.pdf", buf);
console.log("Done:", buf.length, "bytes,", pageCount, "pages");
