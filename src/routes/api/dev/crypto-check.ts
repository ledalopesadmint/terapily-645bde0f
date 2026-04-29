/**
 * Endpoint TEMPORÁRIO de diagnóstico do PHI_ENCRYPTION_KEY.
 *
 * GET /api/dev/crypto-check
 *
 * Roda um round-trip AES-GCM-256 com texto fixo e valida:
 *  - chave existe e tem 32 bytes (após base64 decode)
 *  - encrypt → decrypt retorna o plaintext original
 *  - formato do ciphertext é `v1:base64(iv):base64(ct+tag)` com IV de 12 bytes
 *  - tamper no ciphertext faz a decrypt falhar (integridade GCM)
 *
 * NUNCA loga ou retorna a chave. Apenas booleans + mensagens de erro genéricas.
 *
 * TODO: remover este arquivo antes do launch público (S6).
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  encryptPHIServer,
  decryptPHIServer,
} from "@/lib/crypto/encryption.server";

interface CheckResult {
  success: boolean;
  keyPresent: boolean;
  keyValid: boolean;
  roundTripValid: boolean;
  formatValid: boolean;
  ivBytes: number | null;
  tamperDetected: boolean;
  error?: string;
  failedStep?: string;
}

export const Route = createFileRoute("/api/dev/crypto-check")({
  server: {
    handlers: {
      GET: async () => {
        const result: CheckResult = {
          success: false,
          keyPresent: false,
          keyValid: false,
          roundTripValid: false,
          formatValid: false,
          ivBytes: null,
          tamperDetected: false,
        };

        // 1. Chave presente?
        const raw = process.env.PHI_ENCRYPTION_KEY;
        if (!raw) {
          result.failedStep = "key_present";
          result.error = "PHI_ENCRYPTION_KEY não está definida no ambiente.";
          return Response.json(result, { status: 500 });
        }
        result.keyPresent = true;

        // 2. Chave decodifica e tem 32 bytes?
        try {
          const bin = atob(raw.trim());
          if (bin.length !== 32) {
            result.failedStep = "key_size";
            result.error = `Chave tem ${bin.length} bytes após base64 decode; esperado 32 (AES-256).`;
            return Response.json(result, { status: 500 });
          }
          result.keyValid = true;
        } catch {
          result.failedStep = "key_encoding";
          result.error = "PHI_ENCRYPTION_KEY não é base64 válido.";
          return Response.json(result, { status: 500 });
        }

        const plaintext = "Paciente relata insônia há 3 semanas";
        let ciphertext: string;

        // 3. Encrypt
        try {
          ciphertext = await encryptPHIServer(plaintext);
        } catch (e) {
          result.failedStep = "encrypt";
          result.error = e instanceof Error ? e.message : "Erro desconhecido no encrypt";
          return Response.json(result, { status: 500 });
        }

        // 4. Formato `v1:b64(iv):b64(ct+tag)` com IV de 12 bytes
        const parts = ciphertext.split(":");
        if (parts.length === 3 && parts[0] === "v1") {
          try {
            const ivLen = atob(parts[1]).length;
            result.ivBytes = ivLen;
            result.formatValid = ivLen === 12 && atob(parts[2]).length > 0;
          } catch {
            result.formatValid = false;
          }
        }
        if (!result.formatValid) {
          result.failedStep = "format";
          result.error = "Ciphertext não está no formato v1:base64(iv-12b):base64(ct+tag).";
          return Response.json(result, { status: 500 });
        }

        // 5. Decrypt round-trip
        try {
          const decoded = await decryptPHIServer(ciphertext);
          result.roundTripValid = decoded === plaintext;
          if (!result.roundTripValid) {
            result.failedStep = "round_trip";
            result.error = "Texto descriptografado difere do original.";
            return Response.json(result, { status: 500 });
          }
        } catch (e) {
          result.failedStep = "decrypt";
          result.error = e instanceof Error ? e.message : "Erro desconhecido no decrypt";
          return Response.json(result, { status: 500 });
        }

        // 6. Tamper detection — flipa 1 byte do ciphertext e espera falhar
        try {
          const ctBytes = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
          ctBytes[0] = ctBytes[0] ^ 0x01;
          let tamperedB64 = "";
          for (let i = 0; i < ctBytes.length; i++) tamperedB64 += String.fromCharCode(ctBytes[i]);
          const tampered = `v1:${parts[1]}:${btoa(tamperedB64)}`;
          try {
            await decryptPHIServer(tampered);
            // Se chegou aqui, GCM NÃO detectou adulteração — falha grave.
            result.tamperDetected = false;
            result.failedStep = "tamper_check";
            result.error = "Decrypt aceitou ciphertext adulterado — integridade GCM quebrada.";
            return Response.json(result, { status: 500 });
          } catch {
            result.tamperDetected = true;
          }
        } catch (e) {
          result.failedStep = "tamper_setup";
          result.error = e instanceof Error ? e.message : "Erro montando teste de tamper";
          return Response.json(result, { status: 500 });
        }

        result.success = true;
        return Response.json(result, { status: 200 });
      },
    },
  },
});
