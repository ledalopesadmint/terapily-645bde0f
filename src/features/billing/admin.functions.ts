/**
 * Admin route — sincroniza catálogo stripe_products a partir dos
 * price_ids declarados nas env vars STRIPE_PRICE_BASIC e STRIPE_PRICE_PRACTICE.
 *
 * Acesso: apenas admin (Leda). Idempotente (upsert pelo stripe_price_id).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stripe } from "./stripe.server";

export const syncStripeCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Checa role admin
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      throw new Error("Acesso restrito ao admin.");
    }

    const targets: Array<{ priceId: string | undefined; tier: "basic" | "practice"; nickname: string }> = [
      {
        priceId: process.env.STRIPE_PRICE_BASIC,
        tier: "basic",
        nickname: "Up to 20 active patients",
      },
      {
        priceId: process.env.STRIPE_PRICE_PRACTICE,
        tier: "practice",
        nickname: "Up to 50 active patients · Compliance Report",
      },
    ];

    const synced: Array<{ tier: string; price_id: string; amount: number }> = [];

    for (const t of targets) {
      if (!t.priceId) continue;
      const price = await stripe().prices.retrieve(t.priceId, {
        expand: ["product"],
      });
      const product =
        typeof price.product === "string"
          ? await stripe().products.retrieve(price.product)
          : (price.product as import("stripe").Stripe.Product);

      const limits =
        t.tier === "basic"
          ? { max_active_patients: 20 }
          : { max_active_patients: 50, compliance_report: true };

      const row = {
        stripe_price_id: price.id,
        stripe_product_id: product.id,
        tier: t.tier,
        nickname: t.nickname,
        unit_amount: price.unit_amount ?? 0,
        currency: price.currency,
        interval: price.recurring?.interval ?? "month",
        active: price.active && product.active,
        limits: limits as never,
      };

      await supabaseAdmin
        .from("stripe_products")
        .upsert(row, { onConflict: "stripe_price_id" });

      synced.push({ tier: t.tier, price_id: price.id, amount: row.unit_amount });
    }

    return { synced };
  });
