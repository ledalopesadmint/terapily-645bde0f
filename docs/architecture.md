# Arquitetura — Terapily

> **Regra global:** Toda regra, arquitetura e feature crítica fica em `/docs`.
> Se não está no GitHub, não existe. Memórias `mem://` são índice e contexto da
> Leda — não substituem documentação versionada.

---

## Stack

- **Frontend & SSR:** React 19 + TanStack Start (file-based routing)
- **Estilo:** Tailwind v4 (tokens em `src/styles.css` com `oklch`) + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Postgres + RLS + Auth
- **Server logic:** `createServerFn` (TanStack) sobre Cloudflare Worker (nodejs_compat)
- **Pagamentos:** Stripe BYOK
- **Email transacional:** Resend (gating por `RESEND_BAA_SIGNED`)

---

## Organização de pastas

```
docs/                 Documentação versionada (source of truth pro repo)
src/
  routes/             File-based routing (TanStack)
    _authenticated/   Tudo atrás de auth
    api/              Server routes (webhooks, cron)
    p.$token.tsx      Rota PÚBLICA do magic link (sem auth)
  features/           Módulos de domínio
    activities/       Magic link, scoring, drafts, audit (S3)
    patients/         Cadastro, soft delete, restore (S2)
    auth/             AuthProvider + Supabase session
    billing/          Stripe BYOK (S2)
    workspace/        Multi-tenant
    audit/            Helpers compartilhados de audit
    games/            Placeholder S3+
    library/          Placeholder S3+
  components/         UI compartilhada (shadcn + brand)
  lib/
    crypto/           encryption.server.ts (AES-256-GCM, server-only)
    tokens/           magic-link.server.ts (gerar/hash de tokens)
    rate-limit/       Rate limit em memória do worker
    scoring/          Engine de auto-scoring (PHQ-9, GAD-7…)
  integrations/
    supabase/         client.ts (browser), client.server.ts (admin),
                      auth-middleware.ts (server fn autenticada)
supabase/
  migrations/         SQL versionado
```

**Regra:** todo código de domínio mora em `src/features/<dominio>/`. `src/server/`
não deve crescer — preferimos co-localizar `*.functions.ts` + `*.server.ts` perto
da feature.

---

## Trust boundaries

| Camada                                    | Auth                       | RLS              | Pode ver PHI? |
| ----------------------------------------- | -------------------------- | ---------------- | ------------- |
| Browser (`@/integrations/supabase/client`) | sessão do user             | Sim (como user)  | Só do próprio workspace, decifrado on-demand |
| Server fn autenticada (`requireSupabaseAuth`) | bearer do user           | Sim (como user)  | Idem, mais helpers de scoring/PDF |
| Admin server (`@/integrations/supabase/client.server`) | service role | Bypass (cuidado) | Só dentro de server fns / server routes verificadas |

`*.server.ts` é proibido importar do client (Vite import-protection). Helpers
sensíveis (criptografia, tokens, rate-limit) são `*.server.ts` puro e acessados
apenas por server fns.

---

## Segurança transversal

Detalhes em:

- [`docs/security.md`](./security.md) — RLS, encryption, audit, soft delete
- [`docs/magic-link-rules-locked.md`](./magic-link-rules-locked.md) — tokens, single-use, neutral errors
- [`docs/autosave-security.md`](./autosave-security.md) — drafts cifrados, expiração, purge
- [`docs/activities.md`](./activities.md) — fluxo end-to-end do módulo activities

---

## Princípios

1. **Future-proof por padrão.** Toda feature nova entra com schema, RLS e UI
   reais; nada de mock visual sem backend.
2. **Soft delete sempre.** Nunca `DELETE FROM patients`. 30 dias de janela +
   purge irreversível de PHI mantendo audit.
3. **PHI nunca em URL, log, push, audit metadata, PostHog ou email
   subject/body.** Audit `metadata` JSONB só carrega UUIDs e enums.
4. **Magic link:** EXPIRA O ACESSO → NÃO EXPIRA O DADO.
5. **Vínculo obrigatório:** todo `patient_activity` tem
   workspace + patient + therapist + activity. Nunca link genérico/órfão.
6. **Admin é exclusivo da Leda** (`admin@terapily.com`). Banco bloqueia 2º admin.
