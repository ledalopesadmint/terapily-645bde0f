# LANDING VISUAL REFERENCE — Terapily (legacy)

> Snapshot da estrutura visual da landing antiga (`src/routes/index.tsx`, 1855 linhas). Use como **referência estética**, não como código a ser portado.

⚠️ **NÃO migrar**: copy literal (deve ser revalidada por pesquisa de mercado v2), trackers, scripts de tracking, formulários (Stripe/Supabase), CTAs com `Link to="/signup"` (rotas do novo core ainda inexistentes).

---

## Estilo geral

- Superfícies tonais **alternadas verticalmente** (Cream → Cream-tan → Navy → Cream → Cream-deep). Cria ritmo editorial.
- Sem libs de animação externas — `prefers-reduced-motion` respeitado via CSS puro + `IntersectionObserver` para reveal.
- Ilustrações **SVG inline** (sem imagens raster pesadas). Marcadores `IMG:` deixados como placeholder onde imagens reais vão entrar.
- Tipografia: hero clamp `2.75rem → 4.25rem` Cormorant Light/SemiBold + Inter regular `0.95rem` para sub.

---

## Sections (ordem da landing antiga)

1. **Header sticky** — wordmark `<Logo withIcon />` + nav `text-sm` + CTA `Sign in` outline + CTA `Start free trial` Navy.
2. **Hero** — split (texto + ilustração SVG terapeuta/cliente). Eyebrow terracotta. Frase-âncora: *"Therapeutic tools your clients actually finish."*
3. **5 pilares** — cards uniformes, ícones lucide tingidos Sage, eyebrow + h3 + microcopy de 2 linhas. Pilar 2 com ícones de chat (WhatsApp/SMS/Email/Signal) monocromáticos Sage.
4. **"How it works"** — 3 passos numerados editorialmente (numerais Cormorant gigantes Sage), linha conectora hairline.
5. **Stats strip** — faixa Cream-tan, 4 métricas verificáveis (escalas validadas, formatos de delivery, etc.).
6. **Compliance section** — fundo Navy invertido, eyebrow Cream, h2 Cream, 3 colunas (HIPAA-aligned, BAA on request, audit trail) com microcopy honesto (sem "certified" / "court-defensible").
7. **Pricing** — 2 tier cards (Basic + Practice). Clinic/Patient hidden até pós-S6.
8. **FAQ** — acordeão `radix-ui/accordion`. Sem "Who built this?" (regra: no team claims).
9. **Footer** — links institucionais (privacy, terms, trust, cookies, acceptable-use), wordmark, copyright.

---

## Vocabulário visual recorrente na landing

- **Eyebrow tag com hairline** — `<span class="h-px w-8 bg-sage" /> ACERVO` (Mauve/Sage/Terracotta).
- **Ghost letter** atrás de manchetes hero.
- **Underline SVG mão-escrita** Sage abaixo de palavras-âncora.
- **Hairline divider** entre sections (`border-t border-border/60`).
- **Reveal-on-scroll** via `IntersectionObserver` adicionando `.is-visible` (CSS opacity 0 → 1 + translateY 10px → 0, duration 700ms editorial easing).

---

## O que migrar (visual)

✅ Estrutura de sections + ritmo tonal + tipografia + eyebrow style + pricing card pattern + accordion pattern + footer layout.
✅ Ilustrações SVG inline (são puras, sem dependências).
✅ Reveal-on-scroll com `IntersectionObserver` (15 linhas de JS, agnóstico).

## O que NÃO migrar (lógica/copy)

❌ Copy literal — revalidar contra pesquisa de mercado v2 antes de fixar.
❌ Trackers (PostHog, GA, pixels) — devem entrar via gate de consentimento no novo core.
❌ CTAs com rotas legadas (`/signup`, `/login`, `/dashboard`) — apontam para rotas inexistentes no novo core.
❌ Formulários com `createServerFn` — runtime legado, refazer com contracts novos.
❌ Imports de `@/features/billing/*`, `@/features/auth/*` — runtime contaminado.

---

## Arquivo snapshot

`exports/design-system/landing-reference/legacy-landing.tsx.txt` — cópia íntegra do `src/routes/index.tsx` para consulta visual. **Não importar diretamente**.
