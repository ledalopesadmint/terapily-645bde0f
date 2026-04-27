/**
 * Augmentation de tipos para @lovable.dev/cloud-auth-js.
 *
 * Por que isso existe:
 * - O arquivo auto-gerado src/integrations/lovable/index.ts (gerado pelo
 *   Lovable Cloud, marcado como "Do not modify") declara o provider como
 *   "google" | "apple" | "microsoft" | "lovable".
 * - Porém o tipo `OAuthProvider` exportado pelo SDK
 *   `@lovable.dev/cloud-auth-js` é apenas "google" | "apple" | "microsoft".
 * - Isso gera um TS2345: '"lovable"' is not assignable to OAuthProvider.
 *
 * Como NÃO podemos editar o arquivo auto-gerado, e o `exclude` do tsconfig
 * não é respeitado pelo build checker do Lovable, estendemos o tipo do
 * SDK aqui via module augmentation. Solução tipada, sem `@ts-ignore`,
 * sem `any`, sem mexer em auth/RLS/migrations.
 *
 * DÍVIDA TÉCNICA TEMPORÁRIA — Remover este arquivo quando o SDK
 * @lovable.dev/cloud-auth-js corrigir a inclusão de "lovable" no tipo
 * `OAuthProvider`. Ver docs/technical-debt.md.
 */

declare module "@lovable.dev/cloud-auth-js" {
  // Reabre o módulo e amplia o tipo `OAuthProvider` para incluir "lovable",
  // mantendo os demais providers oficiais.
  export type OAuthProvider = "google" | "apple" | "microsoft" | "lovable";
}

export {};
