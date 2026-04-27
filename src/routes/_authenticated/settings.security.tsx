import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, KeyRound, Trash2 } from "lucide-react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({
    meta: [{ title: "Segurança · Ajustes · Terapily" }],
  }),
  component: SecuritySettingsPage,
});

/**
 * /settings/security — STUB honesto da S1.
 *
 * MFA real (TOTP + recovery codes) chega na S5.
 * Delete account com export e grace period chega na S5.
 *
 * Tudo aqui está EXPLICITAMENTE desativado, sem fluxo fake.
 */
function SecuritySettingsPage() {
  return (
    <section className="space-y-8">
      <div>
        <Eyebrow>Segurança</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-foreground">
          Sua conta blindada.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O essencial já está ativo: senhas verificadas contra vazamentos
          conhecidos e proteção da sessão. As próximas camadas chegam abaixo.
        </p>
      </div>

      {/* Bloco: o que JÁ está protegendo */}
      <div className="rounded-lg border border-secondary/40 bg-secondary/10 px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">
              Senhas verificadas contra vazamentos
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Toda nova senha é checada contra o banco{" "}
              <em>Have I Been Pwned</em>. Senhas comprometidas são rejeitadas
              automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* MFA — stub */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-5 opacity-90">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <KeyRound
              className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  Autenticação em dois passos (MFA)
                </p>
                <Badge
                  variant="outline"
                  className="border-secondary/40 text-secondary-foreground"
                >
                  Em breve · Semana 5
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Vamos suportar TOTP (Authy, Google Authenticator) e códigos de
                recuperação. A re-autenticação será exigida pra ativar.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            aria-disabled
            className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-md bg-muted px-4 text-sm font-medium text-muted-foreground"
          >
            Ativar
          </button>
        </div>
      </div>

      {/* Delete account — stub */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Trash2
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive/70"
              aria-hidden
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  Excluir minha conta
                </p>
                <Badge
                  variant="outline"
                  className="border-secondary/40 text-secondary-foreground"
                >
                  Em breve · Semana 5
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Vai incluir exportação completa dos seus dados, período de
                carência de 30 dias e cascata limpa em todas as tabelas.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            aria-disabled
            className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-md border border-destructive/30 bg-background px-4 text-sm font-medium text-destructive/60"
          >
            Excluir
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Precisa excluir agora?{" "}
        <a
          href="mailto:contato@terapily.com"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Escreva pra gente
        </a>
        .
      </p>
    </section>
  );
}
