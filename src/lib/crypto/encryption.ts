/**
 * Encryption helpers para PHI (Protected Health Information).
 *
 * Interface ESTÁVEL: toda escrita de campo PHI (notas de sessão, mensagens,
 * observações de paciente) DEVE passar por `encryptPHI()` antes do INSERT.
 * Toda leitura passa por `decryptPHI()`.
 *
 * Implementação: AES-GCM-256 via `./encryption.server.ts`. Como cifragem
 * exige a chave secreta `PHI_ENCRYPTION_KEY`, estas funções só podem ser
 * chamadas dentro de server functions (`createServerFn`) ou server routes.
 * Chamar do cliente vai falhar porque `process.env` não existe no browser.
 *
 * Formato do ciphertext: `v1:<base64(iv)>:<base64(ciphertext+tag)>`.
 * Registros antigos sem prefixo `v1:` são tratados como passthrough na
 * leitura (compat com dados criados antes da S2).
 */

import { encryptPHIServer, decryptPHIServer } from "./encryption.server";

export async function encryptPHI(plaintext: string): Promise<string> {
  return encryptPHIServer(plaintext);
}

export async function decryptPHI(ciphertext: string): Promise<string> {
  return decryptPHIServer(ciphertext);
}

/**
 * Marca de tipo pra deixar claro nos schemas Zod e nas server functions
 * quais campos são PHI. Não muda runtime, só documenta intenção.
 */
export type PHI = string & { readonly __phi: unique symbol };
