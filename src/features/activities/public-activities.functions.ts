/**
 * Server functions PÚBLICAS do magic link (paciente sem sessão).
 *
 * Constraints (magic-link-rules-locked):
 *  - Mensagem NEUTRA pra qualquer falha (expirado/usado/inválido/revogado).
 *    Nunca confirma existência do link nem revela status específico.
 *  - Token cru chega só na requisição; nunca é logado.
 *  - PHI nunca aparece em URL, logs ou response.
 *  - resolvePublicToken NÃO retorna nome/email/telefone do paciente —
 *    só o que é necessário pra renderizar a atividade.
 *  - submit marca used_at (single-use), cifra raw_responses, cria
 *    activity_responses, e o status vira "completed".
 *  - Expiração do token NUNCA apaga registros existentes.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withRetry } from "@/lib/retry/with-retry.server";
import { encryptPHIServer } from "@/lib/crypto/encryption.server";
import { hashMagicLinkToken } from "@/lib/tokens/magic-link.server";
import { scoreActivity } from "@/lib/scoring/scoring.server";
import { recordAudit } from "@/features/audit/audit.server";
import { buildScaleResultPDF } from "./scale-result-pdf.server";
import { buildWorksheetResultPDF } from "./worksheet-result-pdf.server";
import { detectClinicalFlag } from "@/server/clinical-flag.server";
import { checkPublicLinkRateLimit } from "@/lib/rate-limit/public-link.server";
import {
  getPatientActivityByTokenHash,
  getActivityFromCatalog,
} from "./activities.server";

function getClientIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

const NEUTRAL_ERROR =
  "Este link não está disponível. Peça um novo link ao seu terapeuta.";

class PublicLinkError extends Error {
  constructor() {
    super(NEUTRAL_ERROR);
    this.name = "PublicLinkError";
  }
}

/** Não loga o token nem PHI; só categoria do problema. */
function logLinkFailure(reason: string) {
  console.warn("[public-link] denied", { reason });
}


// --- resolvePublicToken ----------------------------------------------------

const ResolveSchema = z.object({
  token: z.string().min(16).max(256),
});

export const resolvePublicToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResolveSchema.parse(input))
  .handler(async ({ data }) => {
    const tokenHash = await hashMagicLinkToken(data.token);
    await checkPublicLinkRateLimit({
      ip: getClientIp(),
      tokenHash,
      bucket: "resolve",
    });
    const pa = await getPatientActivityByTokenHash(tokenHash);

    if (!pa) {
      logLinkFailure("not_found");
      throw new PublicLinkError();
    }

    if (pa.status === "revoked") {
      logLinkFailure("revoked");
      throw new PublicLinkError();
    }

    if (pa.used_at) {
      logLinkFailure("already_used");
      throw new PublicLinkError();
    }

    if (!pa.token_expires_at || new Date(pa.token_expires_at).getTime() < Date.now()) {
      // Marca como expirado (mantém TODOS os registros — só fecha o acesso)
      if (pa.status !== "expired") {
        await withRetry(() =>
          supabaseAdmin
            .from("patient_activities")
            .update({ status: "expired", token_hash: null })
            .eq("id", pa.id),
        );
      }
      logLinkFailure("expired");
      throw new PublicLinkError();
    }

    // OK: marca primeira abertura + bump open count + status in_progress
    const now = new Date().toISOString();
    await withRetry(() =>
      supabaseAdmin
        .from("patient_activities")
        .update({
          token_first_opened_at: pa.token_first_opened_at ?? now,
          token_open_count: (pa.token_open_count ?? 0) + 1,
          status: pa.status === "pending" ? "in_progress" : pa.status,
        })
        .eq("id", pa.id),
    );

    const activity = await getActivityFromCatalog(pa.activity_id);
    if (!activity || activity.status !== "published") {
      logLinkFailure("activity_unavailable");
      throw new PublicLinkError();
    }

    // Resposta MÍNIMA. Sem PHI. Sem ids do paciente expostos no front público
    // — o submit usa o token de novo, não o patient_activity_id direto.
    return {
      activity: {
        slug: activity.slug,
        title: activity.title,
        archetype: activity.archetype,
        config: activity.config,
      },
      expiresAt: pa.token_expires_at,
    };
  });

// --- submitActivityResponse -----------------------------------------------

const SubmitSchema = z.object({
  token: z.string().min(16).max(256),
  // Respostas brutas. Não validamos o shape interno aqui (depende do archetype);
  // o scoring engine decide o que fazer.
  responses: z.record(z.string().min(1).max(64), z.unknown()),
});

export const submitActivityResponse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitSchema.parse(input))
  .handler(async ({ data }) => {
    const tokenHash = await hashMagicLinkToken(data.token);
    await checkPublicLinkRateLimit({
      ip: getClientIp(),
      tokenHash,
      bucket: "submit",
    });
    const pa = await getPatientActivityByTokenHash(tokenHash);

    // Mesma porta neutra do resolve.
    if (!pa) {
      logLinkFailure("submit_not_found");
      throw new PublicLinkError();
    }
    if (pa.status === "revoked") {
      logLinkFailure("submit_revoked");
      throw new PublicLinkError();
    }
    if (pa.used_at) {
      logLinkFailure("submit_already_used");
      throw new PublicLinkError();
    }
    if (!pa.token_expires_at || new Date(pa.token_expires_at).getTime() < Date.now()) {
      if (pa.status !== "expired") {
        await withRetry(() =>
          supabaseAdmin
            .from("patient_activities")
            .update({ status: "expired", token_hash: null })
            .eq("id", pa.id),
        );
      }
      logLinkFailure("submit_expired");
      throw new PublicLinkError();
    }

    const activity = await getActivityFromCatalog(pa.activity_id);
    if (!activity || activity.status !== "published") {
      logLinkFailure("submit_activity_unavailable");
      throw new PublicLinkError();
    }

    // 1. Score (sem PHI no metadata)
    const result = scoreActivity(
      activity.archetype as string,
      activity.config,
      data.responses as Record<string, unknown>,
    );
    const flag = detectClinicalFlag(
      activity.config,
      data.responses as Record<string, unknown>,
    );

    // 2. Cifra raw responses (PHI potencial — depende da escala)
    const encrypted = await encryptPHIServer(JSON.stringify(data.responses));

    // 3. Cria activity_responses
    const submittedVia: "in_session" | "shared_link" =
      pa.delivery_mode === "in_session" ? "in_session" : "shared_link";

    const responseInsert = {
      patient_activity_id: pa.id,
      workspace_id: pa.workspace_id,
      patient_id: pa.patient_id,
      activity_id: pa.activity_id,
      raw_responses_encrypted: encrypted,
      score: result.score,
      severity: result.severity,
      scoring_metadata: {
        ...result.metadata,
        clinical_flag: flag.raised
          ? { flag: flag.flag, item_id: flag.item_id }
          : null,
      } as never,
      submitted_via: submittedVia,
    };

    const { data: response, error: respErr } = await withRetry(() =>
      supabaseAdmin
        .from("activity_responses")
        .insert(responseInsert)
        .select("id, score, severity, submitted_at")
        .single(),
    );

    if (respErr || !response) {
      console.error("[submitActivityResponse] insert response failed", {
        code: respErr?.code,
      });
      throw new PublicLinkError();
    }

    // 4. Single-use: marca used_at + status completed + zera token_hash
    //    (acesso fechado, dados permanecem)
    const { error: updErr } = await withRetry(() =>
      supabaseAdmin
        .from("patient_activities")
        .update({
          used_at: new Date().toISOString(),
          status: "completed",
          token_hash: null,
          response_id: response.id,
        })
        .eq("id", pa.id)
        .is("used_at", null),
    );

    if (updErr) {
      console.error("[submitActivityResponse] mark used_at failed", {
        code: updErr.code,
      });
      throw new PublicLinkError();
    }

    // 5. Purga draft (se existir) — regra "EXPIRA O ACESSO → NÃO EXPIRA O DADO".
    //    Resposta final ficou em activity_responses (permanente).
    //    Draft era pré-resposta e não tem mais função.
    const { error: draftErr } = await supabaseAdmin
      .from("activity_drafts")
      .delete()
      .eq("patient_activity_id", pa.id);

    if (draftErr) {
      // Não falha o submit por causa disso — só registra. Próxima purge job pega.
      console.warn("[submitActivityResponse] draft purge failed", {
        code: draftErr.code,
      });
    }

    if (flag.raised) {
      await recordAudit({
        actorId: null,
        workspaceId: pa.workspace_id,
        action: "clinical_flag.raised",
        resourceType: "activity_response",
        resourceId: response.id,
        metadata: {
          patient_id: pa.patient_id,
          patient_activity_id: pa.id,
          activity_id: pa.activity_id,
          flag: flag.flag,
          item_id: flag.item_id,
          submitted_via: submittedVia,
        },
      });
    }

    // Generate patient PDF (auto-download after submit)
    let pdfBase64: string | null = null;
    try {
      if (activity.archetype === "quiz_scale" || activity.archetype === "structured_form") {
        const buildFn = activity.archetype === "structured_form"
          ? buildWorksheetResultPDF
          : buildScaleResultPDF;
        const pdfBuffer = await buildFn({
          activityResponseId: response.id,
          workspaceId: pa.workspace_id,
          variant: "patient",
        });
        const bytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        pdfBase64 = btoa(binary);
      }
    } catch (err) {
      // PDF generation failure should NOT block submit
      console.warn("[submitActivityResponse] PDF generation failed, continuing without", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }

    return { ok: true, pdf: pdfBase64 };
  });
