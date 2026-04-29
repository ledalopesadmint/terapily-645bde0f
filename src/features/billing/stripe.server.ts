/**
 * Stripe server-only helper (BYOK — sk_test_/sk_live_).
 *
 * Importado SOMENTE de:
 *   - createServerFn handlers (.functions.ts)
 *   - server routes (/api/public/*)
 *
 * NUNCA importar em componente React, hook do client, ou loader isomórfico.
 *
 * Modo test/live é detectado pelo prefixo da chave (sk_test_ vs sk_live_).
 * Em S2 trabalhamos 100% em test. Live só ativa quando Leda assinar BAA + Stripe Tax.
 */
import Stripe from "stripe";

let _client: Stripe | null = null;

export function stripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada. Adicione em Cloud → Secrets.",
    );
  }
  _client = new Stripe(key, {
    typescript: true,
    appInfo: {
      name: "Terapily",
      url: "https://terapily.com",
    },
  });
  return _client;
}

export function stripeMode(): "test" | "live" {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_live_") ? "live" : "test";
}

/**
 * URL canônica do app, usada como base pra success/cancel URLs.
 * Em dev, vem do header Origin da request.
 */
export function getAppOrigin(fallback = "https://terapily.com"): string {
  return process.env.APP_ORIGIN ?? fallback;
}
