/**
 * Admin Compliance Console — server functions (createServerFn).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listWorkspacesForAdmin,
  getWorkspaceDetail,
  getPatientActivityHistory,
} from "./admin-compliance.server";

/* ─── List all workspaces (admin only) ───────────────────────── */
export const adminListWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS enforces admin-only via has_role
    return listWorkspacesForAdmin(context.supabase);
  });

/* ─── Workspace detail (members + patients) ──────────────────── */
export const adminGetWorkspaceDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    return getWorkspaceDetail(context.supabase, data.workspaceId);
  });

/* ─── Patient activity history ───────────────────────────────── */
export const adminGetPatientHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      workspaceId: z.string().uuid(),
      patientId: z.string().uuid(),
    }).parse(data),
  )
  .handler(async ({ context, data }) => {
    return getPatientActivityHistory(context.supabase, data.workspaceId, data.patientId);
  });
