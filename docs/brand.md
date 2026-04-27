# Brand · Terapily (resumo aplicado ao código)

Documento vivo com as regras do Brand Book v3 traduzidas para o código.

## Tokens (src/styles.css)

```css
:root {
  --sage:     oklch(0.661 0.045 153.6);  /* #7E9B86 */
  --navy:     oklch(0.280 0.027 251.0);  /* #1F2A36 */
  --cream:    oklch(0.954 0.013 82.4);   /* #F4EFE6 */
  --mauve:    oklch(0.718 0.036 359.6);  /* #B89BA3 */
  --charcoal: oklch(0.366 0.015 259.8);  /* #3A3F47 */
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
