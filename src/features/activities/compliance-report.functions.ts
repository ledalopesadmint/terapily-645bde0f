/**
 * Compliance Report — server function (S3 §8).
 *
 * Practice only. Returns base64 PDF.
 * Wording PROIBIDO: "HIPAA-certified", "court-defensible", "legally binding".
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordAudit } from "@/features/audit/audit.server";
import { buildComplianceReportPDF } from "./compliance-report.server";

const ReportSchema = z.object({
  patientId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  from: z.string().min(10).max(30),
  to: z.string().min(10).max(30),
});

export const generateComplianceReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    // 1. Practice gating
    const { data: hasFeature } = await supabaseAdmin.rpc("has_feature", {
      _workspace_id: data.workspaceId,
      _flag: "compliance_report",
    });
    if (!hasFeature) {
      throw new Error("Compliance Report is available on the Practice plan.");
    }

    // 2. Membership check
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!membership) throw new Error("Sem permissão neste workspace.");

    // 3. Get therapist profile (name, license, NPI) + workspace name
    const [profileRes, wsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, license_number, npi").eq("id", userId).maybeSingle(),
      supabase.from("workspaces").select("name").eq("id", data.workspaceId).maybeSingle(),
    ]);

    const therapistName = profileRes.data?.full_name ?? "Therapist";
    const workspaceName = wsRes.data?.name ?? "Workspace";

    // 4. Generate PDF
    const pdfBytes = await buildComplianceReportPDF({
      patientId: data.patientId,
      workspaceId: data.workspaceId,
      from: data.from,
      to: data.to,
      therapistName,
      workspaceName,
      licenseNumber: profileRes.data?.license_number ?? undefined,
      npi: profileRes.data?.npi ?? undefined,
    });

    // 5. Audit (no PHI)
    await recordAudit({
      actorId: userId,
      workspaceId: data.workspaceId,
      action: "compliance_report.generated",
      resourceType: "patient",
      resourceId: data.patientId,
      metadata: {
        from: data.from,
        to: data.to,
      },
    });

    // 6. Return base64
    const bytes = new Uint8Array(pdfBytes);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return { pdf: base64 };
  });
