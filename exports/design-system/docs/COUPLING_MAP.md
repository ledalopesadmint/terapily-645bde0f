# COUPLING MAP — O que NÃO migrar para o novo core

> Mapeamento dos acoplamentos perigosos do projeto antigo. Tudo listado aqui é **runtime legado contaminado** e deve ser **refeito** no novo core a partir dos contracts novos, não copiado.

---

## 🚫 NÃO MIGRAR (runtime legado, arquitetura antiga)

### Auth & sessão
- `src/features/auth/AuthProvider.tsx`
- `src/features/auth/profile.functions.ts`
- `src/features/auth/auth-events.functions.ts`
- `src/features/auth/useRedirectIfAuthenticated.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/routes/login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `auth.callback.tsx`
- `src/types/lovable-auth-augmentation.d.ts`

**Motivo:** Auth nova é Supabase BYOS + legal gate + bootstrap transacional. Tudo aqui presume runtime antigo.

### Supabase client / runtime
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/types.ts`
- `src/start.ts` (registra `attachSupabaseAuth`)

**Motivo:** Service role e middleware acoplados ao runtime legado.

### Camada clínica (runtime de atividades / players / runners)
- `src/features/activities/*`
- `src/features/library/runners/**/*` (breathing, drag_drop, guided_script, structured_form)
- `src/features/library/ActivityCard.tsx`, `CategoryBrowser.tsx`, `CategoryRow.tsx`, `ScaleCard.tsx`, `InSessionQuickAccess.tsx`, `LibraryHero.tsx`, `PatientPickerSheet.tsx`, `RecommendedEmpty.tsx`, `ResourceBox.tsx`
- `src/features/library/archetypes.ts`, `library.types.ts`, `seed-data.ts`, `illustrations.tsx`
- `src/features/games/_core/*`
- `src/lib/scoring/scoring.server.ts`
- `src/server/clinical-flag.server.ts`

**Motivo:** Activity runtime será desacoplado via Module Engine no novo core (pacotes já exportados em mensagens anteriores).

### Magic link / ephemeral / habit (server-side)
- `src/features/ephemeral/*.server.ts`, `*.functions.ts`
- `src/features/habits/*.server.ts`, `*.functions.ts`
- `src/lib/tokens/magic-link.server.ts`
- `src/lib/rate-limit/public-link.server.ts`
- `src/routes/p.$token.tsx`, `h.$token.tsx`, `e.$token.tsx`

**Motivo:** Contracts antigos. Refazer com boundaries rígidos client/server e legal gate.

### Pacientes / patients
- `src/features/patients/patients.functions.ts`, `patients.types.ts`
- `src/features/patients/components/*` (DeletePatientDialog, PatientForm, PatientList, RevealContactDialog, PatientLimitBanner/Modal)
- `src/routes/_authenticated/patients*.tsx`

**Motivo:** Acoplados a tabela `patients` legada com encryption/decryption específica.

### Billing / Stripe
- `src/features/billing/*`
- `src/routes/api/public/stripe-webhook.ts`
- `src/routes/_authenticated/settings.billing.tsx`

**Motivo:** Webhook e plan engine acoplados. Refazer no novo core com contracts.

### PDF runtime antigo
- `src/server/admin-compliance.server.ts`
- `src/server/admin-compliance.functions.ts`
- `src/features/habits/habit-report.server.ts`, `habit-report.functions.ts`
- `pdf-brand-assets.server.ts` (se existir)

**Motivo:** PDF Engine 2.0 nova será desacoplada. Apenas reusar **templates visuais** documentados (compliance-report-template, worksheet-result-pdf, audit-report-pdf-template).

### Audit / analytics / logger
- `src/features/audit/audit.server.ts`
- `src/features/analytics/*`
- `src/lib/logging/activity-logger.server.ts`
- `src/lib/logger.server.ts`, `src/lib/logger.ts`
- `src/routes/api/public/hooks/*`

**Motivo:** Audit trail e analytics aggregator são da arquitetura antiga.

### Admin / compliance
- `src/server/admin.functions.ts`
- `src/server/admin-compliance.*`
- `src/routes/_authenticated/admin*.tsx`

**Motivo:** Admin console é da arquitetura antiga.

### Encryption / crypto
- `src/lib/crypto/encryption.server.ts`
- `docs/key-rotation.md` (manter como **referência de processo**, não código)

**Motivo:** Schema de chaves novo no BYOS.

### Migrations Supabase
- `supabase/migrations/*` (TODAS)
- `supabase/config.toml`

**Motivo:** Schema antigo é incompatível com novo core. Refazer de zero.

### Hooks acoplados
- `src/features/auth/AuthProvider`-dependent: tudo que chama `useAuth()` direto.
- `src/features/billing/*` hooks.
- `src/features/feature-flags/useFeatureFlag.ts` (acoplado a tabela legada).

---

## ⚠️ MIGRAR COM REFATOR (visual OK, lógica refazer)

### `src/components/layout/AppShell.tsx`
- ✅ **Visual:** estrutura sidebar, tokens, layout.
- ❌ **Lógica:** consome `useAuth()`, `useQuery(getCurrentSubscription)`, `hasRole()` direto.
- **Ação:** dividir em `<AppShellLayout>` (puro, recebe props) + `<AppShellContainer>` (no novo core).

### `src/components/brand/AuthShell.tsx`
- ✅ **Visual:** split editorial Navy/Cream, ghost "H", underline SVG, glow.
- ❌ **Lógica:** `<Link to="/" />` aponta para landing legada.
- **Ação:** trocar `Link` por componente `<BrandLink>` agnóstico no novo core.

### `src/routes/index.tsx` (landing)
- ✅ **Visual:** estrutura de sections, ritmo tonal, ilustrações SVG.
- ❌ **Lógica:** CTAs apontam para rotas inexistentes; copy precisa revalidar.
- **Ação:** ver `LANDING_VISUAL_REFERENCE.md`.

---

## ✅ MIGRAR DIRETO (puro / visual / agnóstico)

### Tokens
- `src/design-system/tokens/*` — TUDO.
- `src/styles.css` — pode ser migrado **como referência**; ajustar imports do Tailwind do novo core.

### Componentes UI puros (shadcn original)
Todos em `src/components/ui/*` são **puros visuais** (Radix + cn + tokens). Migrar todos:
`accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, card, carousel, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip`.

⚠️ **Atenção** ao migrar `sidebar.tsx` (744 linhas) e `chart.tsx` (331 linhas) — verificar dependências de hooks internos antes.

### Componentes brand visuais puros
- `src/components/brand/Logo.tsx`
- `src/components/brand/Eyebrow.tsx`
- `src/components/brand/SidebarLogo.tsx`
- `src/components/brand/GoogleButton.tsx`
- `src/components/brand/CapsLockHint.tsx`
- `src/components/feedback/EmptyState.tsx`

**Atenção:** `AuthShell.tsx` migra como visual mas precisa do refator do `<Link>` (ver acima).

### Assets brand
- `src/assets/terapily-icon.webp`
- `src/assets/terapily-icon-cream.webp`
- `src/assets/terapily-t-cream.png`

### Utils agnósticos
- `src/lib/utils.ts` (`cn` helper) — 100% puro.

### Docs de processo (referência)
- `docs/brand.md`
- `docs/architecture.md` (como referência, não código)
- `docs/security.md`
- `docs/magic-link-rules-locked.md`
- `docs/s3-definition-of-done.md`
- `docs/scale-result-pdf-template.md`
- `docs/habit-tracker-links.md`
- `clinical-references/**` — fontes científicas (manter intacto, copiar para novo core).

---

## Resumo numérico

| Categoria | Arquivos | Veredito |
|-----------|----------|----------|
| Auth/Supabase runtime | ~15 | ❌ Não migrar |
| Activity runtime / players | ~40 | ❌ Não migrar |
| Magic/ephemeral/habit server | ~10 | ❌ Não migrar |
| Patients / billing / admin | ~25 | ❌ Não migrar |
| PDF runtime antigo | ~5 | ❌ Não migrar (manter templates visuais como doc) |
| Migrations Supabase | TODAS | ❌ Não migrar |
| **AppShell + AuthShell + Landing** | 3 | ⚠️ Visual sim, lógica refazer |
| **Tokens + styles.css** | 8 | ✅ Migrar |
| **shadcn UI puros** | 44 | ✅ Migrar |
| **Brand visuais puros** | 6 | ✅ Migrar |
| **Assets** | 3 | ✅ Migrar |
| **clinical-references** | ~40 | ✅ Migrar (intacto) |
