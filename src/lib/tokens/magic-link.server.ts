/**
 * Magic link token generation + hashing.
 *
 * SERVER-ONLY. Regras (constraint magic-link-rules-locked):
 *  - Token cru NUNCA persiste — só o SHA-256 hex.
 *  - Token cru é retornado UMA vez para o terapeuta na criação.
 *  - 256 bits de entropia (32 bytes random base64url).
 */

const TOKEN_BYTES = 32;

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

/** Gera token cru em base64url (URL-safe, sem padding). */
export function generateMagicLinkToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return base64UrlEncode(bytes);
}

/** SHA-256 hex (lowercase) — formato exigido pelo CHECK no DB. */
export async function hashMagicLinkToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}
