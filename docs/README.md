# Terapily — Docs

Esta pasta versiona, dentro do repositório Git, as regras, decisões e
constraints críticas do projeto que também vivem como memórias internas do
agente (`mem://...`).

> **Por que duplicar?** Memórias `mem://` são persistentes entre sessões do
> agente, mas **não vão pro GitHub**. Estes arquivos garantem que toda regra
> inegociável de segurança, HIPAA e produto fique versionada, auditável e
> revisável fora do Lovable.

## Índice

- [`magic-link-rules-locked.md`](./magic-link-rules-locked.md) — Regras
  travadas do magic link + atividades. Source of truth da S3.
- [`s3-definition-of-done.md`](./s3-definition-of-done.md) — Checklist
  bloqueante de Semana 3 (schema, RLS, server functions, UI, cenários de
  segurança).
- [`security.md`](./security.md) — Postura de segurança consolidada do
  projeto: RLS, multi-tenant, PHI, audit, single admin, HIPAA.
- [`autosave-security.md`](./autosave-security.md) — Regras inegociáveis do
  autosave (`activity_drafts`) tratado como extensão crítica de PHI.
- [`scale-result-pdf-template.md`](./scale-result-pdf-template.md) — Template
  TRAVADO (v10) do Scale Result PDF. Padrão mínimo de qualidade inegociável.

## Regra de ouro

Em caso de conflito entre código e qualquer documento desta pasta, **o
documento vence**. Código é ajustado pra refletir a regra, não o contrário.
Qualquer desvio precisa de aprovação explícita da Leda registrada no commit
e na memória correspondente.
