/**
 * Lightweight token → activity metadata lookup for OG tags.
 * SERVER-ONLY. No side effects (no open counting, no rate limiting).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashMagicLinkToken } from "@/lib/tokens/magic-link.server";

export async function getActivityMetaByToken(
  token: string,
): Promise<{ title: string; slug: string } | null> {
  try {
    const tokenHash = await hashMagicLinkToken(token);

    const { data: pa } = await supabaseAdmin
      .from("patient_activities")
      .select("activity_id")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!pa) return null;

    const { data: activity } = await supabaseAdmin
      .from("activity_catalog")
      .select("title, slug")
      .eq("id", pa.activity_id)
      .single();

    if (!activity) return null;

    return { title: activity.title, slug: activity.slug };
  } catch {
    return null;
  }
}
