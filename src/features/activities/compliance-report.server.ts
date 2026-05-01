/**
 * Compliance Report — PDF generation (S3 §8).
 *
 * SERVER-ONLY. Gera PDF "Audit-ready summary for your records" com:
 *  - Cabeçalho: paciente (decifrado) + terapeuta + workspace + período
 *  - Lista cronológica DESC: atividade + score + banda + modo
 *  - Practice only (gating via has_feature('compliance_report'))
 *  - Wording proibido: "HIPAA-certified", "court-defensible", "legally binding"
 *
 * Usa jsPDF (pure JS, Worker-safe).
 */

import { jsPDF } from "jspdf";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptPHIServer } from "@/lib/crypto/encryption.server";
import { logServerError } from "@/lib/logger.server";

interface ReportParams {
  patientId: string;
  workspaceId: string;
  from: string; // ISO date
  to: string;   // ISO date
  therapistName: string;
  workspaceName: string;
}

interface ReportRow {
  activityTitle: string;
  score: number | null;
  severity: string | null;
  deliveryMode: string;
  submittedAt: string;
}

export async function buildComplianceReportPDF(params: ReportParams): Promise<Uint8Array> {
  // 1. Fetch patient name (decrypt)
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("display_name, full_name_encrypted")
    .eq("id", params.patientId)
    .eq("workspace_id", params.workspaceId)
    .maybeSingle();

  let patientLabel = patient?.display_name ?? "Paciente";
  if (patient?.full_name_encrypted) {
    try {
      const decrypted = await decryptPHIServer(patient.full_name_encrypted);
      if (decrypted) patientLabel = decrypted;
    } catch (err) {
      logServerError("compliance-report.decrypt", err);
    }
  }

  // 2. Fetch responses in period
  const { data: responses } = await supabaseAdmin
    .from("activity_responses")
    .select(`
      score,
      severity,
      submitted_via,
      submitted_at,
      activity_id,
      patient_activity:patient_activities!patient_activities_response_fk ( delivery_mode ),
      activity:activity_catalog!inner ( title )
    `)
    .eq("patient_id", params.patientId)
    .eq("workspace_id", params.workspaceId)
    .gte("submitted_at", params.from)
    .lte("submitted_at", params.to)
    .order("submitted_at", { ascending: false });

  const rows: ReportRow[] = (responses ?? []).map((r) => ({
    activityTitle: (r as any).activity?.title ?? "Activity",
    score: r.score != null ? Number(r.score) : null,
    severity: r.severity,
    deliveryMode: (r as any).patient_activity?.delivery_mode ?? r.submitted_via ?? "unknown",
    submittedAt: r.submitted_at,
  }));

  // 3. Build PDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Compliance Report", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Audit-ready summary for your records", margin, y);
  y += 8;

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Patient:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(patientLabel, margin + 22, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Therapist:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.therapistName, margin + 25, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Workspace:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.workspaceName, margin + 27, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Period:", margin, y);
  doc.setFont("helvetica", "normal");
  const fromDate = new Date(params.from).toLocaleDateString("en-US");
  const toDate = new Date(params.to).toLocaleDateString("en-US");
  doc.text(`${fromDate} — ${toDate}`, margin + 18, y);
  y += 8;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Table header
  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text("No completed activities in this period.", margin, y);
  } else {
    const colX = {
      date: margin,
      activity: margin + 28,
      mode: margin + 100,
      score: margin + 130,
      severity: margin + 150,
    };

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Date", colX.date, y);
    doc.text("Activity", colX.activity, y);
    doc.text("Mode", colX.mode, y);
    doc.text("Score", colX.score, y);
    doc.text("Severity", colX.severity, y);
    y += 2;
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    for (const row of rows) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      const dateStr = new Date(row.submittedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      doc.text(dateStr, colX.date, y);
      // Truncate long activity names
      const title = row.activityTitle.length > 38
        ? row.activityTitle.slice(0, 35) + "…"
        : row.activityTitle;
      doc.text(title, colX.activity, y);
      doc.text(row.deliveryMode.replace("_", " "), colX.mode, y);
      doc.text(row.score != null ? String(row.score) : "—", colX.score, y);
      doc.text(row.severity ?? "—", colX.severity, y);
      y += 5;
    }
  }

  // Footer
  y = 280;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `Generated by Terapily on ${new Date().toISOString().slice(0, 10)}. This is an audit-ready summary, not a clinical document.`,
    margin,
    y,
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
