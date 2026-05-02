/**
 * Magic link token generation + hashing.
 *
 * SERVER-ONLY. Regras (constraint magic-link-rules-locked):
 *  - Token cru NUNCA persiste — só o SHA-256 hex.
 *  - Token cru é retornado UMA vez para o terapeuta na criação.
 *  - 128 bits de entropia (16 bytes random base64url).
 *  - Prefixo opcional com slug da atividade pra URL amigável.
 *
 * Formato resultante: "phq-9-Kx8mD2nPqRsT_vWx" (slug + "-" + random)
 * Se slug não for fornecido: "Kx8mD2nPqRsT_vWx" (random puro, compatível com tokens antigos)
 */

const TOKEN_BYTES = 16; // 128 bits — amply secure for single-use tokens

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Gera token cru em base64url (URL-safe, sem padding).
 * Se `slug` for fornecido, prefixa: "phq-9-Kx8m..." → URL amigável.
 */
export function generateMagicLinkToken(slug?: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  const random = base64UrlEncode(bytes);
  if (slug) {
    // Sanitiza slug: lowercase, alfanumérico + hífens, max 40 chars
    const clean = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40);
    if (clean.length > 0) {
      return `${clean}-${random}`;
    }
  }
  return random;
}

/** SHA-256 hex (lowercase) — formato exigido pelo CHECK no DB. */
export async function hashMagicLinkToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}
