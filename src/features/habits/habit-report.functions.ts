/**
 * Server function wrapper for habit progress PDF generation.
 * Safe to import from components — build strips server body.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateHabitProgressPdf } from "./habit-report.server";

const HabitReportSchema = z.object({
  habitLinkId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  patientId: z.string().uuid(),
});

export const generateHabitProgressReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HabitReportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Permission check: must be workspace member
    const { supabase } = context;
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!membership) {
      throw new Error("Sem permissão neste workspace.");
    }

    const pdfBytes = await generateHabitProgressPdf({
      habitLinkId: data.habitLinkId,
      workspaceId: data.workspaceId,
      patientId: data.patientId,
    });

    return { pdfBytes };
  });