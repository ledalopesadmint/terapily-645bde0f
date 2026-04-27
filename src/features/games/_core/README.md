# Games · Core Module

Pasta destinada à infraestrutura compartilhada dos jogos terapêuticos do Terapily.

## Status atual: PLACEHOLDER (Semana 1)

Conforme plano de 6 semanas, **nenhum jogo é implementado na S1**.
Aqui ficam apenas:

- `game.types.ts` — Contrato estável do payload de qualquer jogo
- `GameShell.tsx` — Shell visual compartilhado (stub na S1)
- `useGameSession.ts` — Hook de ciclo de vida da sessão (stub na S1)
- `ShareableLink.tsx` — Geração de magic link pro paciente (stub na S1)

## Quando os jogos entram

- **S3-S4**: Tabelas `game_sessions`, `game_results`, `game_events` + magic link real
- **S3**: Primeiro jogo — Anatomia da Ansiedade

## Regras pra adicionar um jogo novo (futuro)

1. Cada jogo vira pasta irmã: `/features/games/anatomia-ansiedade/`
2. **Lazy load obrigatório** — jogos NUNCA entram no bundle inicial
3. **Proibido** Phaser, Three.js, PixiJS ou qualquer engine pesada
4. Implementar contrato `Game` de `game.types.ts`:
   ```ts
   interface Game {
     id: string;
     name: string;
     component: React.LazyExoticComponent<...>;
     summary: (data: unknown) => string; // Pré-interpretação pro terapeuta
   }
   ```
5. Toda escrita de PHI passa por `encryptPHI()` de `lib/crypto/encryption.ts`
6. Magic link pro paciente usa **hash do token**, nunca o token cru no banco
