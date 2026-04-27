/**
 * Override de tipos para @lovable.dev/cloud-auth-js.
 *
 * Por que isso existe:
 * - O arquivo auto-gerado src/integrations/lovable/index.ts (gerado pelo
 *   Lovable Cloud, marcado como "Do not modify") declara o provider como
 *   "google" | "apple" | "microsoft" | "lovable".
 * - Porém o tipo `OAuthProvider` exportado pelo SDK
 *   `@lovable.dev/cloud-auth-js` v0.x é apenas
 *   "google" | "apple" | "microsoft".
 * - Isso gera o erro TS2345: '"lovable"' is not assignable to OAuthProvider.
 *
 * Como NÃO podemos editar o arquivo auto-gerado, fazemos um shadow do
 * módulo via ambient declaration, expandindo `OAuthProvider`. Solução
 * tipada (sem `@ts-ignore`, sem `any`), sem alterar auth/RLS/migrations.
 *
 * DÍVIDA TÉCNICA TEMPORÁRIA — remover este arquivo quando o SDK
 * @lovable.dev/cloud-auth-js corrigir a inclusão de "lovable" no tipo
 * `OAuthProvider`. Ver docs/technical-debt.md.
 */

declare module "@lovable.dev/cloud-auth-js" {
  export type OAuthProvider = "google" | "apple" | "microsoft" | "lovable";

  export interface LovableAuthConfig {
    oauthBrokerUrl?: string;
    supportedOAuthOrigins?: string[];
  }

  export interface OAuthTokens {
    access_token: string;
    refresh_token: string;
  }

  export interface SignInWithOAuthOptions {
    redirect_uri?: string;
    extraParams?: Record<string, string>;
  }

  export type SignInWithOAuthResult =
    | { tokens: OAuthTokens; error: null; redirected?: false }
    | { tokens?: undefined; error: Error; redirected?: false }
    | { tokens?: undefined; error: null; redirected: true };

  export interface LovableAuth {
    signInWithOAuth: (
      provider: OAuthProvider,
      opts?: SignInWithOAuthOptions,
    ) => Promise<SignInWithOAuthResult>;
  }

  export function createLovableAuth(config?: LovableAuthConfig): LovableAuth;
}
