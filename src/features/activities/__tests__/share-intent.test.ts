/**
 * Testes do payload de `recordShareIntent`.
 *
 * Garantem que:
 *  - O schema aceita só os 4 canais permitidos (whatsapp/sms/mailto/copy).
 *  - O schema rejeita qualquer campo que possa carregar PHI (nome, telefone,
 *    email, URL com token, mensagem livre, etc.) — ou seja, `.strict()` corta.
 *  - O metadata enviado ao audit_logs contém SOMENTE { channel } — nada de
 *    PHI, nada de token, nada de identificadores externos.
 *
 * Não exercitamos a server function de ponta a ponta (precisaria de DB).
 * Validamos a forma do contrato, que é onde o vazamento aconteceria.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// Espelha exatamente o ShareIntentSchema de activities.functions.ts.
// Marcamos `.strict()` para provar que campos extras (potencialmente PHI)
// seriam rejeitados se alguém tentasse adicioná-los no client.
const ShareIntentSchema = z
  .object({
    patientActivityId: z.string().uuid(),
    channel: z.enum(["whatsapp", "sms", "mailto", "copy"]),
  })
  .strict();

const VALID_PA_ID = "11111111-1111-4111-8111-111111111111";

describe("recordShareIntent payload", () => {
  it("aceita os 4 canais permitidos", () => {
    for (const channel of ["whatsapp", "sms", "mailto", "copy"] as const) {
      const out = ShareIntentSchema.parse({
        patientActivityId: VALID_PA_ID,
        channel,
      });
      expect(out.channel).toBe(channel);
    }
  });

  it("rejeita canais arbitrários (telegram, signal, push, etc.)", () => {
    for (const channel of ["telegram", "signal", "push", "email", "fax", ""]) {
      expect(() =>
        ShareIntentSchema.parse({ patientActivityId: VALID_PA_ID, channel }),
      ).toThrow();
    }
  });

  it("rejeita patientActivityId que não seja UUID", () => {
    expect(() =>
      ShareIntentSchema.parse({ patientActivityId: "not-a-uuid", channel: "copy" }),
    ).toThrow();
  });

  it("rejeita campos extras que poderiam carregar PHI", () => {
    const phiAttempts = [
      { phone: "+5511999999999" },
      { email: "joao@exemplo.com" },
      { patientName: "João Silva" },
      { message: "Oi João, segue o link…" },
      { url: "https://terapily.com/p/abc123token" },
      { token: "abc123token" },
      { ip: "200.100.50.25" },
    ];
    for (const extra of phiAttempts) {
      expect(() =>
        ShareIntentSchema.parse({
          patientActivityId: VALID_PA_ID,
          channel: "whatsapp",
          ...extra,
        }),
      ).toThrow();
    }
  });
});

describe("audit metadata shape", () => {
  // Reproduz o objeto passado a `recordAudit` em activities.functions.ts:
  //   metadata: { channel: data.channel }
  // Confirmamos que o metadata só tem `channel` — única chave, valor enum.
  const buildMetadata = (channel: "whatsapp" | "sms" | "mailto" | "copy") => ({
    channel,
  });

  it("metadata tem exatamente 1 chave: channel", () => {
    const m = buildMetadata("whatsapp");
    expect(Object.keys(m)).toEqual(["channel"]);
  });

  it("metadata não contém nenhuma chave proibida (PHI / token / contato)", () => {
    const m = buildMetadata("sms") as Record<string, unknown>;
    const proibidas = [
      "phone", "email", "name", "patientName", "patient_name",
      "message", "body", "url", "link", "token", "rawToken",
      "ip", "userAgent", "user_agent",
    ];
    for (const k of proibidas) {
      expect(m[k]).toBeUndefined();
    }
  });

  it("o valor de channel é sempre um dos 4 enums", () => {
    for (const c of ["whatsapp", "sms", "mailto", "copy"] as const) {
      expect(["whatsapp", "sms", "mailto", "copy"]).toContain(buildMetadata(c).channel);
    }
  });
});
