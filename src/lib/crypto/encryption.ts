/**
 * Encryption helpers para PHI (Protected Health Information).
 *
 * REGRA FUTURE-PROOF: Esta interface é ESTÁVEL. Toda escrita de campo PHI
 * (notas de sessão, mensagens, observações de paciente) DEVE passar por
 * `encryptPHI()` antes do INSERT. Toda leitura passa por `decryptPHI()`.
 *
 * S1 (atual): passthrough — retorna o input cru. Necessário pra que toda
 * tabela e server function nasçam já chamando estas funções nos lugares
 * certos, evitando refator na S2 quando o AES-GCM-256 entrar.
 *
 * S2 (próxima semana): implementação real com AES-GCM-256, chave em
 * `process.env.PHI_ENCRYPTION_KEY` (256 bits, base64), IV aleatório por
 * mensagem prefixado no ciphertext.
 *
 * IMPORTANTE: este arquivo NÃO é `.server.ts` porque a interface é
 * compartilhada — mas a implementação real S2 vai depender de chave server-only.
 * Quando isso acontecer, este arquivo vira proxy pra `encryption.server.ts`.
 */

/**
 * Criptografa um texto PHI antes de armazenar no banco.
 * S1: passthrough. S2: AES-GCM-256.
 */
export async function encryptPHI(plaintext: string): Promise<string> {
  // TODO Semana 2: implementar AES-GCM-256
  // const key = await getEncryptionKey();
  // const iv = crypto.getRandomValues(new Uint8Array(12));
  // const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  // return base64(iv) + ':' + base64(ciphertext);
  return plaintext;
}

/**
 * Descriptografa um texto PHI lido do banco.
 * S1: passthrough. S2: AES-GCM-256.
 */
export async function decryptPHI(ciphertext: string): Promise<string> {
  // TODO Semana 2: implementar AES-GCM-256
  return ciphertext;
}

/**
 * Marca de tipo pra deixar claro nos schemas Zod e nas server functions
 * quais campos são PHI. Não muda runtime, só documenta intenção.
 */
export type PHI = string & { readonly __phi: unique symbol };
