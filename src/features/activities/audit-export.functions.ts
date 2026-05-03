/**
 * Audit export — PDF + CSV generation (S6).
 *
 * SERVER-ONLY. Generates branded PDF or raw CSV of audit logs
 * for a specific patient. No PHI in audit logs (only UUIDs).
 *
 * Brand rules: same as Compliance Report (Navy header, footer, watermark).
 */

import { jsPDF } from "jspdf";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ICON_PNG_B64 } from "./pdf-brand-assets.server";

// ── Brand colors ──
const NAVY = [31, 42, 54] as const;
const CREAM = [244, 239, 230] as const;
const SAGE = [126, 155, 134] as const;
const CHARCOAL = [58, 63, 71] as const;
const WHITE = [255, 255, 255] as const;

const AUDIT_LABEL: Record<string, string> = {
  "activity.assigned": "Atividade enviada",
  "activity.share_intent": "Link compartilhado pelo terapeuta",
  "activity.link_opened": "Link aberto pelo paciente",
  "activity.draft_saved": "Progresso salvo",
  "activity.draft_loaded": "Progresso retomado",
  "activity.draft_discarded": "Rascunho descartado",
  "activity.submitted": "Atividade respondida",
  "activity.status_changed": "Status alterado",
  "activity.response_recorded": "Resposta registrada",
  "activity.revoked": "Atividade revogada",
  "compliance_report.generated": "Compliance Report gerado",
  "patient.contact_revealed": "Contato revelado",
  "clinical_flag.raised": "Flag clínica detectada",
  "clinical_flag.resolved": "Flag clínica resolvida",
  "clinical_flag.acknowledged": "Flag clínica reconhecida",
};

const ExportSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  patientDisplayName: z.string().min(1).max(200),
  format: z.enum(["pdf", "csv"]),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  actions: z.array(z.string()).optional(),
});

export const exportAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1. Get patient_activity IDs for this patient
    const { data: pas } = await supabase
      .from("patient_activities")
      .select("id")
      .eq("patient_id", data.patientId)
      .eq("workspace_id", data.workspaceId);

    const paIds = (pas ?? []).map((p) => p.id);

    const { data: responses } = await supabase
      .from("activity_responses")
      .select("id")
      .eq("patient_id", data.patientId)
      .eq("workspace_id", data.workspaceId);

    const responseIds = (responses ?? []).map((r) => r.id);
    const resourceIds = Array.from(new Set([...paIds, ...responseIds, data.patientId]));

    // 2. Query audit logs with optional filters
    let query = supabase
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, metadata, created_at, actor_id")
      .in("resource_id", resourceIds)
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.actions && data.actions.length > 0) {
      query = query.in("action", data.actions);
    }
    if (data.fromDate) {
      query = query.gte("created_at", data.fromDate);
    }
    if (data.toDate) {
      query = query.lte("created_at", data.toDate + "T23:59:59.999Z");
    }

    const { data: logs, error } = await query;

    if (error) {
      if (error.code === "PGRST301" || error.code === "42501") {
        throw new Error("Permissão negada.");
      }
      throw new Error("Não foi possível carregar a auditoria.");
    }

    const entries = (logs ?? []) as Array<{
      id: string;
      action: string;
      resource_type: string;
      resource_id: string;
      metadata: Record<string, unknown>;
      created_at: string;
      actor_id: string | null;
    }>;

    if (data.format === "csv") {
      return generateCsv(entries, data.patientDisplayName);
    }

    return generatePdf(entries, data.patientDisplayName, data.fromDate, data.toDate);
  });

// ── CSV ──

function generateCsv(
  logs: Array<{ action: string; created_at: string; resource_type: string; resource_id: string }>,
  patientName: string,
) {
  const header = "Data/Hora,Ação,Descrição,Tipo Recurso,ID Recurso";
  const rows = logs.map((l) => {
    const dt = new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const label = AUDIT_LABEL[l.action] ?? l.action;
    return `"${dt}","${l.action}","${label}","${l.resource_type}","${l.resource_id}"`;
  });

  const csv = [header, ...rows].join("\n");
  const b64 = Buffer.from(csv, "utf-8").toString("base64");

  return {
    base64: b64,
    mimeType: "text/csv",
    filename: `auditoria-${patientName.replace(/\s+/g, "-").toLowerCase()}.csv`,
  };
}

// ── PDF ──

function generatePdf(
  logs: Array<{ action: string; created_at: string; resource_type: string; resource_id: string }>,
  patientName: string,
  fromDate?: string,
  toDate?: string,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 15;
  const MR = 15;
  const contentW = W - ML - MR;

  function drawHeader() {
    // Navy header bar
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 28, "F");

    // Icon
    try {
      doc.addImage(`data:image/png;base64,${ICON_PNG_B64}`, "PNG", ML, 4, 10, 10);
    } catch { /* icon optional */ }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text("Trilha de Auditoria", ML + 14, 12);

    // Patient name
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Paciente: ${patientName}`, ML + 14, 18);

    // Date range
    const rangeText = fromDate || toDate
      ? `Período: ${fromDate ?? "início"} — ${toDate ?? "hoje"}`
      : "Período: completo";
    doc.text(rangeText, ML + 14, 23);

    // Generated at
    doc.setFontSize(7);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      W - MR,
      23,
      { align: "right" },
    );
  }

  function newPage() {
    doc.addPage();
    drawHeader();
  }

  // First page
  drawHeader();

  // Table header
  let y = 34;
  const colWidths = [38, 50, contentW - 88]; // Date, Action code, Description
  const ROW_H = 6;

  function drawTableHeader(yPos: number) {
    doc.setFillColor(...SAGE);
    doc.rect(ML, yPos, contentW, ROW_H, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text("DATA / HORA", ML + 2, yPos + 4);
    doc.text("AÇÃO", ML + colWidths[0] + 2, yPos + 4);
    doc.text("DESCRIÇÃO", ML + colWidths[0] + colWidths[1] + 2, yPos + 4);
    return yPos + ROW_H;
  }

  y = drawTableHeader(y);

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    if (y + ROW_H > H - 18) {
      newPage();
      y = 34;
      y = drawTableHeader(y);
    }

    // Alternate row bg
    if (i % 2 === 0) {
      doc.setFillColor(248, 247, 244);
      doc.rect(ML, y, contentW, ROW_H, "F");
    }

    doc.setTextColor(...CHARCOAL);
    const dt = new Date(log.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    doc.text(dt, ML + 2, y + 4);

    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(log.action, ML + colWidths[0] + 2, y + 4);

    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    const label = AUDIT_LABEL[log.action] ?? log.action;
    doc.text(label, ML + colWidths[0] + colWidths[1] + 2, y + 4);

    y += ROW_H;
  }

  // Summary
  y += 4;
  if (y > H - 30) {
    newPage();
    y = 34;
  }
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${logs.length} evento${logs.length !== 1 ? "s" : ""}`, ML, y);

  // ── Draw footers on ALL pages with "X de Y" pagination ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...CREAM);
    doc.rect(0, H - 12, W, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(...CHARCOAL);
    doc.text("terapily", ML, H - 5);
    doc.text(
      "Registros sem dados clínicos — apenas IDs, ações e horários.",
      W / 2,
      H - 5,
      { align: "center" },
    );
    doc.text(`${p} de ${totalPages}`, W - MR, H - 5, { align: "right" });
  }

  const b64 = doc.output("datauristring").split(",")[1];

  return {
    base64: b64,
    mimeType: "application/pdf",
    filename: `auditoria-${patientName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
  };
}
