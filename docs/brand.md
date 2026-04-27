# Brand · Terapily (resumo aplicado ao código)

Documento vivo com as regras do Brand Book v3 traduzidas para o código.

## Tokens (src/styles.css)

```css
:root {
  --sage:     oklch(0.65 0.04 152);   /* #7E9B86 */
  --navy:     oklch(0.22 0.02 232);   /* #1F2A36 */
  --cream:    oklch(0.95 0.01 80);    /* #F4EFE6 */
  --mauve:    oklch(0.70 0.04 0);     /* #B89BA3 */
  --charcoal: oklch(0.32 0.01 232);   /* #3A3F47 */
}
```

Mapeamento semântico shadcn:

- `--background` = Cream
- `--foreground` = Charcoal
- `--primary` = Navy (substitui preto puro)
- `--secondary` / `--accent` / `--ring` = Sage
- `--card` = Cream-light

## Tipografia

| Token Tailwind | Family | Uso |
|---|---|---|
| `font-display` | Cormorant | Manchetes, hero, citações |
| `font-sans` (default) | Inter | UI, corpo, microcopy |

Eyebrow: classe `.eyebrow` ou componente `<Eyebrow tone="mauve" \| "sage" \| "muted" />`.

## Componentes brand

- `<Logo size="sm" \| "md" \| "lg" \| "xl" />` — wordmark sempre minúsculo
- `<Eyebrow>` — ALL CAPS tracked +120, default tom Mauve
- `<EmptyState comingSoonWeek="Semana X">` — substituto honesto pra qualquer feature ainda não implementada

## Regras de cor (não-negociáveis)

1. Proporção **60/30/10** — Cream 60% · Navy 30% · Sage ou Mauve 10%
2. **Preto puro `#000` PROIBIDO** — sempre Navy
3. **Mauve só decorativo** — ≤8% da página, nunca em corpo de texto
4. **Sage e Mauve nunca lado a lado** — sempre separados por Cream/Navy
5. Cores de status sempre acompanham ícone ou rótulo (acessibilidade)
6. Texto sobre Sage: usar Navy (6.2:1, AA Large). Nunca Cream sobre Sage.

## Microcopy padrão (src/lib/constants.ts → `COPY`)

- Salvar → "Salvo."
- Pronto → "Pronto."
- Loading → "Um momento."
- Boas-vindas → "Bem-vinda de volta."
- Onboarding → "Pronto. Vamos começar."
- Erro → "Algo não funcionou. Tente novamente."

## Voz

- Autoridade calma, contenção editorial
- Falar com **pessoas**, NUNCA "usuários"
- Microcopy mínimo — uma palavra basta quando possível
- Sem emojis em copy de produto
- Sem comparações tipo "O Uber da terapia"
