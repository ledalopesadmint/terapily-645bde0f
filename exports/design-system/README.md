# Terapily — Legacy Design System Export

Pacote auto-contido com a camada VISUAL do projeto antigo da Terapily,
extraída para servir como referência de migração para o NOVO CORE
(Supabase BYOS, Module Engine, contracts tipados, PDF Engine 2.0).

## Estrutura

```
exports/design-system/
├── README.md                            ← este arquivo
├── LEGACY_DESIGN_MIGRATION_REPORT.txt   ← relatório completo (ler primeiro)
├── design-tokens/
│   ├── colors.ts                        ← palette + semantic + sidebar + action + status + activity themes
│   ├── typography.ts                    ← Cormorant + Inter + eyebrow + fluid scale
│   ├── spacing.ts                       ← escala 4px + section padding + containers
│   ├── radius.ts                        ← --radius 0.5rem + escala
│   ├── shadows.ts                       ← warm-tinted shadows + gradients
│   ├── motion.ts                        ← durations + easings + keyframes + reduced-motion
│   ├── layout.ts                        ← breakpoints + zIndex + appShell + grids
│   ├── index.ts                         ← re-export agregado
│   └── styles.css                       ← snapshot canônico do styles.css
├── ui-components/
│   ├── ui/                              ← 44 shadcn componentes puros
│   ├── brand/                           ← Logo, Eyebrow, SidebarLogo, AuthShell, GoogleButton, CapsLockHint
│   └── feedback/                        ← EmptyState
├── landing-reference/
│   └── legacy-landing.tsx.txt           ← snapshot da landing (referência visual)
├── docs/
│   ├── LEGACY_VISUAL_AUDIT.md           ← identidade visual completa
│   ├── APP_SHELL_REFERENCE.md           ← shell autenticado, sidebar, header mobile
│   ├── LANDING_VISUAL_REFERENCE.md      ← estrutura visual da landing
│   └── COUPLING_MAP.md                  ← o que NÃO migrar
├── assets/
│   ├── terapily-icon.webp
│   ├── terapily-icon-cream.webp
│   └── terapily-t-cream.png
└── screenshots/                         ← reservado p/ snapshots futuros
```

## Regras de uso

1. **Leia primeiro** `LEGACY_DESIGN_MIGRATION_REPORT.txt`.
2. **Tokens** são copiáveis 1:1 — zero acoplamento.
3. **Componentes UI** (`ui-components/ui/`) são shadcn puros — copiáveis 1:1
   após instalar peer deps (Radix + lucide-react + class-variance-authority +
   tailwind-merge + clsx).
4. **Componentes brand** são puros visuais, EXCETO `AuthShell.tsx` que precisa
   substituir `<Link to="/">` por um `<BrandLink>` agnóstico no novo core.
5. **Landing** (`landing-reference/legacy-landing.tsx.txt`) é apenas referência
   visual — NÃO importar/portar literalmente; refazer no novo core seguindo
   `docs/LANDING_VISUAL_REFERENCE.md`.
6. **NÃO** copie nada deste projeto antigo que NÃO esteja nesta pasta. Tudo
   fora daqui está contaminado pelo runtime legado (Supabase antigo, auth
   antigo, RLS antigo, PDF runtime antigo).

## Peer dependencies esperadas no novo core

```
react ^19
@tanstack/react-router *
tailwindcss ^4
tw-animate-css *
@radix-ui/react-*   (todos os primitives usados pelos shadcn copiados)
lucide-react *
class-variance-authority *
tailwind-merge *
clsx *
```

## Fontes

- **Cormorant** (display) — Google Fonts, pesos 300/400/500/600
- **Inter** (sans) — Google Fonts, pesos 400/500/600/700/800,
  `font-feature-settings: "ss01", "cv11"`

## Identidade

Brand Book v3 (2026). Paleta Sage / Navy / Cream / Mauve / Charcoal.
Regra inegociável: preto puro `#000` PROIBIDO — sempre Navy.
