# LEGACY VISUAL AUDIT — Terapily (origem)

> Documento de referência para migração SEGURA da identidade visual deste projeto antigo (runtime legado) para o novo core (Supabase BYOS, módulo engine, contracts tipados).

**Status do projeto antigo:** Legacy Design Reference System.
Nenhuma lógica, auth, RLS, runtime clínico ou PDF runtime deve ser reaproveitada — apenas a camada visual.

---

## 1. Identidade visual (Brand Book v3 · 2026)

### Paleta principal (oklch)

| Token       | Hex       | oklch                            | Uso |
|-------------|-----------|----------------------------------|-----|
| Sage        | `#7E9B86` | `oklch(0.661 0.045 153.6)`       | Acento secundário, sidebar active ink, rings |
| Navy        | `#1F2A36` | `oklch(0.280 0.027 251.0)`       | `primary`, sidebar bg, ink editorial. **Substitui preto puro.** |
| Cream       | `#F4EFE6` | `oklch(0.954 0.013 82.4)`        | `background`, foreground sobre Navy |
| Mauve       | `#B89BA3` | `oklch(0.718 0.036 359.6)`       | Eyebrows, ornamentos decorativos. **≤8% da página.** |
| Charcoal    | `#3A3F47` | `oklch(0.366 0.015 259.8)`       | `foreground` corpo |

### Tons editoriais auxiliares

| Token      | oklch                       | Uso |
|------------|-----------------------------|-----|
| Terracotta | `oklch(0.665 0.082 65)`     | Eyebrow editorial pontual (hero) |
| Cream-tan  | `oklch(0.918 0.022 82)`     | Faixa cream tostada (stats strip, activity bg) |
| Rust       | `oklch(0.52 0.105 35)`      | Sinaliza ausência sem alarmar |

### Cores exclusivas de ação (memorização por cor)

Estas cores **NÃO aparecem em nenhum outro lugar** do sistema. Objetivo: prevenir erro humano.

| Botão                | bg                              | fg |
|----------------------|---------------------------------|------------------------|
| Flag clínica         | `oklch(0.58 0.18 22)` coral     | branco quente |
| Relatório Paciente   | `oklch(0.56 0.10 175)` teal     | branco |
| Relatório Terapeuta  | `oklch(0.55 0.12 350)` rosa-q.  | branco |

### Status semáforo

Active = emerald-600 · Archived = amber-500 · Deleted = red-600 (com `subtle` e `muted` para estados inativos).

### Sidebar editorial

Navy profundo (`oklch(0.235 0.025 251.0)`), texto Cream atenuado, hover Navy +1 stop, **item ativo = tinta Sage sutil em texto**, sem barra colorida.

### Regras inegociáveis

1. **Preto puro `#000` PROIBIDO** — sempre Navy.
2. **Mauve só decorativo** — nunca em corpo de texto.
3. **Sage e Mauve nunca lado a lado** — separados por Cream/Navy.
4. **Proporção 60/30/10** — Cream (60) / Navy (30) / Sage|Mauve (10).
5. **Texto sobre Sage = Navy** (6.2:1 AA Large). Nunca Cream sobre Sage.
6. Cores de status sempre acompanham ícone OU rótulo (acessibilidade).

---

## 2. Tipografia

| Família  | Uso |
|----------|-----|
| **Cormorant** (display, serif, SemiBold) | Manchetes, hero, citações. `line-height: 1.05`, `letter-spacing: -0.01em`. |
| **Inter** (sans, default) | UI, corpo, microcopy. `line-height: 1.5`. `font-feature-settings: "ss01", "cv11"` no body. |

**Eyebrow** — ALL CAPS, Inter ExtraBold, `font-size: 0.6875rem`, `letter-spacing: 0.12em` (+120 do brand book). Default tom Mauve.

**Escala fluida** (clamp): hero `2.75rem → 4.25rem`, display `2rem → 3.25rem`, h1 `1.75rem → 2.5rem`.

**Wordmark `terapily`** — sempre minúsculo. Capitalizado SÓ em prosa (Terapily). Variante com ponto Sage final: `terapily.` (ponto recebe `text-secondary`).

---

## 3. Spacing, radius, shadows

- **Spacing:** escala Tailwind v4 (4px base). Section padding mobile `py-12 px-6` · desktop `py-24 px-16`. Containers `max-w-2xl/4xl/6xl/7xl`.
- **Radius:** `--radius: 0.5rem` base, escala `sm/md/lg/xl/2xl/3xl` offset por ±4px. Cards = `lg`, botões = `md`, hairlines = `none`.
- **Shadows warm-tinted:** todas derivadas de Navy oklch (nunca preto puro). `glow` usa `var(--activity-glow)` no hover dos activity cards.
- **Gradients:** radial Sage no painel navy do auth, hairline horizontal no topo dos cards do acervo, diagonal cream → cream-tan no hero.

---

## 4. Motion (conservador, clínico)

- Durations: `100ms → 700ms`. Default UI = `200ms`. Reveal-on-scroll = `700ms`.
- Easings: `editorial` (`cubic-bezier(0.22, 1, 0.36, 1)`) para reveals premium; `standard` para UI.
- Sem bounce. Sem easing exagerado.
- `prefers-reduced-motion`: rule global obrigatória.

---

## 5. Sidebar / shell autenticado

- Largura fixa `w-64` (256px), `sticky top-0 h-screen`, visível `md+`.
- Logo `SidebarLogo` (glifo "t" Cream + wordmark Cormorant Cream + ponto Sage).
- Workspace switcher chip Navy +1, eyebrow `text-[0.625rem]` tracking `0.12em`.
- Nav items: `rounded-md px-3 py-2.5 text-sm`, hover `bg-sidebar-accent`, active `bg-sage/15 text-cream font-medium` + ícone tingido Sage.
- Mobile (< md): header `h-14` cream, sidebar escondida, logout no canto.
- Rodapé: badge de contexto (admin / plano ativo / trial) + avatar circular Sage com iniciais Navy.

---

## 6. Auth shell (split editorial)

- Grid `lg:grid-cols-[5fr_6fr]`.
- Painel esquerdo Navy com âncora editorial: ghost "H" gigante (opacity 0.05), frase com itálico + underline SVG mão-escrita Sage, glow radial Sage top-right (opacity 0.08), footnote tracked.
- Painel direito Cream: header com `<Logo withIcon />`, eyebrow + h1 Cormorant `text-4xl→5xl`, form, disambiguation note ("clinicians only").

---

## 7. Activity cards (acervo)

- Atributo `data-theme="sage|mauve|navy|cream|terracotta|sage-dark"` controla 3 tokens locais (`--activity-accent`, `--activity-illustration-bg`, `--activity-glow`).
- Faixa hairline no topo via gradient, ilustração em bg pastel, hover eleva via `shadow-glow`.

---

## 8. Responsividade

- Breakpoint primário **md (768px)** — onde a sidebar aparece/some.
- Mobile-first: containers `px-6`, hero clamp, grids `grid-cols-1 md:grid-cols-12`.
- Activity box: 3 formatos (desktop linha única `justify-end`, tablet, mobile grid dinâmico sem gaps com última linha esticada).

---

## 9. Landing (resumo visual)

- Superfícies tonais alternadas (Cream → Cream-tan → Navy → Cream).
- Reveal-on-scroll generoso, ilustrações SVG inline (sem libs externas).
- Marcadores `IMG:` deixados como ponto de inserção pra imagens reais.
- Hero: eyebrow terracotta + h1 Cormorant XL + paragraph Inter + CTA dual.
- Sem testimonials inventados (regra de copy honesta).

---

## 10. Vocabulário visual recorrente

- **Hairline divider** — 1px Cream-deep ou Sage 50% opacity, separa seções.
- **Eyebrow chip** — texto tracked acima de h1/h2.
- **Ghost letter** — letra Cormorant gigante atrás de manchete (opacity 0.05).
- **Underline SVG mão-escrita** — abaixo de palavra-âncora em hero/auth.
- **Pastel illustration bg** — derivado do `data-theme` da atividade.
- **Sage dot accent** — ponto final do wordmark sempre Sage.

---

> Conferir tokens canônicos em `src/design-system/tokens/` e CSS de origem em `src/styles.css`.
