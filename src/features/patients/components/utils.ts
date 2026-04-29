/**
 * Helpers compartilhados pelos componentes da feature.
 * Mantidos isomórficos (sem `process.env`, sem imports `.server`).
 */
import { toast } from "sonner";

export const CLIPBOARD_CLEAR_MS = 30_000;

export function deriveInitials(displayName: string): string {
  const cleaned = displayName.trim().replace(/[^\p{L}\p{N}]/gu, "");
  return cleaned.slice(0, 2).toUpperCase() || "??";
}

export function looksLikeRealName(value: string): boolean {
  const words = value.trim().split(/\s+/).filter((w) => w.length >= 2);
  return words.length >= 3;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}

/**
 * Copia valor PHI pra clipboard e auto-limpa após CLIPBOARD_CLEAR_MS.
 * Nunca loga o valor — só sucesso/erro.
 */
export async function copyAndAutoClear(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`, {
      description: "A área de transferência será limpa em 30s.",
    });
    window.setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === value) await navigator.clipboard.writeText("");
      } catch {
        try {
          await navigator.clipboard.writeText("");
        } catch {
          /* ignore */
        }
      }
    }, CLIPBOARD_CLEAR_MS);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}
