/**
 * Server function wrappers for habit progress PDF generation.
 * Two variants: patient (motivational) and therapist (analytical).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildHabitReportPDF } from "./habit-report.server";

const HabitReportSchema = z.object({
  habitLinkId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  patientId: z.string().uuid(),
});

async function checkPermissionAndGetInfo(
  supabase: any,
  userId: string,
  workspaceId: string,
) {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!membership) {
    throw new Error("Sem permissão neste workspace.");
  }

  // Get therapist info for therapist variant
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, license_number, npi")
    .eq("id", userId)
    .maybeSingle();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();

  return {
    name: profile?.full_name ?? "Therapist",
    practice: workspace?.name ?? "Practice",
    license: profile?.license_number ?? "",
    npi: profile?.npi ?? "",
  };
}

export const generateHabitReportPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HabitReportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    await checkPermissionAndGetInfo(supabase, userId, data.workspaceId);

    const pdfBytes = await buildHabitReportPDF(
      { habitLinkId: data.habitLinkId, workspaceId: data.workspaceId, patientId: data.patientId },
      "patient",
    );
    return { pdfBytes };
  });

export const generateHabitReportTherapist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HabitReportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const therapistInfo = await checkPermissionAndGetInfo(supabase, userId, data.workspaceId);

    const pdfBytes = await buildHabitReportPDF(
      { habitLinkId: data.habitLinkId, workspaceId: data.workspaceId, patientId: data.patientId },
      "therapist",
      therapistInfo,
    );
    return { pdfBytes };
  });

// Legacy compat
export const generateHabitProgressReport = generateHabitReportPatient;
