/**
 * Implementação real de cifragem PHI — AES-GCM-256.
 *
 * SERVER-ONLY: este arquivo lê `process.env.PHI_ENCRYPTION_KEY` e por isso
 * não pode ser importado em código de cliente. O proxy público vive em
 * `./encryption.ts` e delega aqui dentro de server functions.
 *
 * Formato do ciphertext: `v1:<base64(iv)>:<base64(ciphertext+tag)>`
 *  - `v1` permite versionamento futuro (rotação de chave, troca de algoritmo).
 *  - IV de 12 bytes aleatório por mensagem (recomendação NIST pra GCM).
 *  - Tag de autenticação de 128 bits embutida no ciphertext (default GCM).
 *
 * Garantias:
 *  - Confidencialidade: AES-256 em modo GCM.
 *  - Integridade/autenticidade: tag GCM detecta qualquer adulteração.
 *  - Não-determinismo: mesmo plaintext gera ciphertexts diferentes (IV aleatório).
 */

const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32; // AES-256

let cachedKey: CryptoKey | null = null;

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const raw = process.env.PHI_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PHI_ENCRYPTION_KEY não configurada. Sem ela não é possível ler/escrever PHI."
    );
  }

  let keyBytes: Uint8Array;
  try {
    keyBytes = base64Decode(raw.trim());
  } catch {
    throw new Error("PHI_ENCRYPTION_KEY inválida: precisa ser base64.");
  }

  if (keyBytes.length !== KEY_BYTES) {
    throw new Error(
      `PHI_ENCRYPTION_KEY inválida: esperado ${KEY_BYTES} bytes (AES-256), recebido ${keyBytes.length}.`
    );
  }

  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

export async function encryptPHIServer(plaintext: string): Promise<string> {
  if (plaintext === "" || plaintext == null) return plaintext;
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return `${VERSION}:${base64Encode(iv)}:${base64Encode(new Uint8Array(ciphertext))}`;
}

export async function decryptPHIServer(payload: string): Promise<string> {
  if (payload === "" || payload == null) return payload;

  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== VERSION) {
    // Compatibilidade: registros antigos (passthrough S1) não têm prefixo.
    // Retorna como veio pra não quebrar leitura de dados pré-encryption.
    if (!payload.startsWith(`${VERSION}:`)) return payload;
    throw new Error("Formato de ciphertext PHI inválido.");
  }

  const [, ivB64, dataB64] = parts;
  const iv = base64Decode(ivB64);
  const data = base64Decode(dataB64);
  const key = await getKey();

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Falha ao descriptografar PHI: dado adulterado ou chave incorreta.");
  }
}
