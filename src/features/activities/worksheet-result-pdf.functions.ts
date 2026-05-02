/**
 * Worksheet Result PDF — server functions.
 *
 * Mirrors scale-result-pdf.functions.ts but routes to the
 * worksheet-specific PDF builder for structured_form activities.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordAudit } from "@/features/audit/audit.server";
import { buildWorksheetResultPDF } from "./worksheet-result-pdf.server";

const ResultSchema = z.object({
  activityResponseId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

function uint8ToBase64(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function getTherapistContext(
  supabase: any,
  userId: string,
  workspaceId: string,
) {
  const [profileRes, wsRes] = await Promise.all([
    supabase.from("profiles").select("full_name, license_number, npi").eq("id", userId).maybeSingle(),
    supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
  ]);
  return {
    therapistName: profileRes.data?.full_name ?? "Therapist",
    workspaceName: wsRes.data?.name ?? "Workspace",
    licenseNumber: profileRes.data?.license_number ?? undefined,
    npi: profileRes.data?.npi ?? undefined,
  };
}

export const generateWorksheetResultPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResultSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!membership) throw new Error("Sem permissão neste workspace.");

    const pdfBuffer = await buildWorksheetResultPDF({
      activityResponseId: data.activityResponseId,
      workspaceId: data.workspaceId,
      variant: "patient",
    });

    await recordAudit({
      actorId: userId,
      workspaceId: data.workspaceId,
      action: "worksheet_result.patient_generated",
      resourceType: "activity_response",
      resourceId: data.activityResponseId,
      metadata: {},
    });

    return { pdf: uint8ToBase64(pdfBuffer) };
  });

export const generateWorksheetResultTherapist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResultSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!membership) throw new Error("Sem permissão neste workspace.");

    const ctx = await getTherapistContext(supabase, userId, data.workspaceId);

    const pdfBuffer = await buildWorksheetResultPDF({
      activityResponseId: data.activityResponseId,
      workspaceId: data.workspaceId,
      variant: "therapist",
      ...ctx,
    });

    await recordAudit({
      actorId: userId,
      workspaceId: data.workspaceId,
      action: "worksheet_result.therapist_generated",
      resourceType: "activity_response",
      resourceId: data.activityResponseId,
      metadata: {},
    });

    return { pdf: uint8ToBase64(pdfBuffer) };
  });
