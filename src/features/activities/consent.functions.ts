/**
 * Server functions PÚBLICAS de consentimento (paciente sem sessão).
 *
 * Constraints:
 *  - Consentimento é PER-ACTIVITY (cada magic link exige consentimento novo).
 *  - Registro imutável: só INSERT, nunca UPDATE/DELETE.
 *  - Se paciente recusa: status → 'declined', token invalidado, acesso fechado.
 *  - Mensagem neutra pra qualquer falha.
 *  - Token NUNCA logado.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  getRequestIP,
  getRequestHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import { getPatientActivityByTokenHash } from "./activities.server";
import { checkPublicLinkRateLimit } from "@/lib/rate-limit/public-link.server";

const NEUTRAL_ERROR =
  "Este link não está disponível. Peça um novo link ao seu terapeuta.";

class PublicLinkError extends Error {
  constructor() {
    super(NEUTRAL_ERROR);
    this.name = "PublicLinkError";
  }
}

function getClientIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

/** Returns a valid inet value or null for DB storage */
function getClientIpForDb(): string | null {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}

function getClientUA(): string {
  try {
    return getRequestHeader("user-agent") ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Current consent text shown to patients (PT-BR). Version-tracked. */
export const CONSENT_VERSION = "1.0";

export const CONSENT_TEXT_PT = `Ao prosseguir, você autoriza o compartilhamento das suas respostas com o(a) terapeuta responsável por esta atividade.

Seus dados são protegidos por criptografia AES-256 de ponta a ponta. Apenas o(a) terapeuta designado(a) terá acesso às suas respostas.

Seu progresso é salvo automaticamente no servidor de forma criptografada. Se você fechar esta página antes de finalizar, poderá continuar de onde parou enquanto o link estiver ativo.

Ao concluir, suas respostas serão registradas permanentemente no seu prontuário dentro da plataforma do(a) terapeuta. Os dados serão retidos conforme a política de retenção da clínica e as exigências legais aplicáveis.

Você pode recusar o consentimento. Nesse caso, este link será encerrado e o(a) terapeuta será notificado(a) da sua decisão. Nenhum dado de resposta será coletado.`;

const ConsentSchema = z.object({
  token: z.string().min(16).max(256),
  accepted: z.boolean(),
});

/**
 * Records patient consent decision. Must be called BEFORE the activity begins.
 * If declined: marks patient_activity as 'declined', invalidates token.
 */
export const recordActivityConsent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConsentSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    const ua = getClientUA();
    const tokenHash = await hashMagicLinkToken(data.token);

    await checkPublicLinkRateLimit({
      ip,
      tokenHash,
      bucket: "consent",
    });

    const pa = await getPatientActivityByTokenHash(tokenHash);

    if (!pa) throw new PublicLinkError();
    if (pa.status === "revoked" || pa.used_at) throw new PublicLinkError();
    if (
      !pa.token_expires_at ||
      new Date(pa.token_expires_at).getTime() < Date.now()
    ) {
      throw new PublicLinkError();
    }

    // Check if consent already recorded for this patient_activity
    const { data: existing } = await supabaseAdmin
      .from("activity_consents")
      .select("id, accepted")
      .eq("patient_activity_id", pa.id)
      .maybeSingle();

    if (existing) {
      // Already consented — return current state
      return { ok: true, accepted: existing.accepted };
    }

    // Hash the consent text for audit proof
    const textBytes = new TextEncoder().encode(CONSENT_TEXT_PT);
    const hashBuf = await crypto.subtle.digest("SHA-256", textBytes);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Insert consent record (immutable)
    const { error: insertErr } = await supabaseAdmin
      .from("activity_consents")
      .insert({
        patient_activity_id: pa.id,
        workspace_id: pa.workspace_id,
        patient_id: pa.patient_id,
        consent_version: CONSENT_VERSION,
        consent_text_hash: hashHex,
        accepted: data.accepted,
        ip: getClientIpForDb(),
        user_agent: ua,
      });

    if (insertErr) {
      console.error("[recordActivityConsent] insert failed", {
        code: insertErr.code,
        message: insertErr.message,
      });
      throw new PublicLinkError();
    }

    // If declined: invalidate token + update status
    if (!data.accepted) {
      await supabaseAdmin
        .from("patient_activities")
        .update({
          status: "declined" as any,
          token_hash: null,
          used_at: new Date().toISOString(),
        })
        .eq("id", pa.id);
    }

    return { ok: true, accepted: data.accepted };
  });
