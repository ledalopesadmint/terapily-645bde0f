# Rotação da chave de cifragem PHI

> Status: **estrutura preparada, rotação real só na S5** (junto com hash chain de
> audit_logs e MFA). Este documento descreve o desenho. Não rodar nada disso
> antes do dia agendado.

## Por quê

- HIPAA Security Rule §164.312(a)(2)(iv) recomenda revisão periódica das
  chaves de cifragem.
- Se uma chave vazar (ex: backup acessado indevidamente), precisamos poder
  trocar sem reescrever toda a base de dados do dia para a noite.
- A primeira chave (`v1`) foi gerada na S2. Janela natural de rotação:
  S5 → anual depois disso, ou imediato em qualquer suspeita de leak.

## Formato do ciphertext

Cada valor cifrado em `*_encrypted` no banco já carrega um **prefixo de
versão**:

```
v1:<base64(iv)>:<base64(ciphertext+tag)>
```

O prefixo (`v1`, `v2`, …) é o que permite descriptografar com a chave certa
sem precisar gravar metadado em coluna separada.

## Mapa de chaves (desenho-alvo)

Em vez de `process.env.PHI_ENCRYPTION_KEY` (uma chave só), na rotação
passamos a usar um mapa indexado por versão:

```ts
// src/lib/crypto/encryption.server.ts (forma futura)
const KEYS: Record<string, CryptoKey> = {
  v1: await importKey(process.env.PHI_ENCRYPTION_KEY_V1!),
  v2: await importKey(process.env.PHI_ENCRYPTION_KEY_V2!),
};

const CURRENT_VERSION: keyof typeof KEYS = "v2";
```

Regras:

- **Sempre criptografar com a versão atual** (`CURRENT_VERSION`).
  Toda escrita nova nasce com `v2:…`.
- **Descriptografar baseado no prefixo** do payload. `v1:…` usa a chave
  antiga, `v2:…` usa a nova.
- **Nunca apagar uma chave antiga enquanto existir registro com esse prefixo
  no banco.** A varredura `select count(*) from patients where
  full_name_encrypted like 'v1:%'` precisa retornar 0 antes do delete da
  chave.

## Procedimento de rotação (passo a passo, S5+)

1. **Gerar `PHI_ENCRYPTION_KEY_V2`** (32 bytes random, base64). Guardar no
   secrets do Lovable Cloud com esse nome. NÃO sobrescrever a v1.
2. **Renomear o secret atual** de `PHI_ENCRYPTION_KEY` para
   `PHI_ENCRYPTION_KEY_V1` (ou ler do mesmo nome em modo legacy enquanto
   mantém compat).
3. **Subir código** com `KEYS = { v1, v2 }` e `CURRENT_VERSION = "v2"`.
   A partir desse deploy, toda escrita nova já nasce com `v2:`.
4. **Job de re-encryption em background** (server function rodando em batch
   pequeno, idealmente sob uma feature flag):
   - Selecionar 100 linhas com `LIKE 'v1:%'` em qualquer coluna `*_encrypted`.
   - Decifrar com v1, recifrar com v2, `UPDATE` na mesma transação.
   - Logar via `logServerError("phi.rotate", err)` em caso de falha. Nunca
     logar plaintext nem ciphertext.
   - Auditar `phi.rotate_batch` com `{ count, from: "v1", to: "v2" }`.
5. **Quando `count(*) where col like 'v1:%' = 0`** em todas as colunas →
   remover a chave v1 do mapa, deletar o secret `PHI_ENCRYPTION_KEY_V1` e
   simplificar o código.

## Janela de coexistência

Durante a rotação, `decryptPHIServer` precisa aceitar **qualquer prefixo
mapeado**. Se receber um prefixo desconhecido (`v3:` quando o mapa só tem
v1+v2) → erro, nunca passthrough.

A regra atual em produção (`docs/security.md`) já bloqueia plaintext sem
prefixo — isso continua valendo na rotação.

## O que NÃO fazer

- ❌ Rotacionar chave sem janela de coexistência. Vai quebrar leitura de
  todos os pacientes existentes.
- ❌ Reusar a mesma chave com versão nova (ex: `v2` apontando pra mesma
  string de `v1`). Defeats the purpose.
- ❌ Deletar a chave antiga antes do batch de re-encryption terminar.
- ❌ Logar plaintext no batch. Em hipótese alguma. Usa `logServerError`.
- ❌ Disparar o batch em horário de pico. Roda de madrugada (UTC), em
  workspaces pequenos primeiro, com kill switch (feature flag).

## Plano de teste antes de rodar

1. Em dev: gerar v2, criar 5 pacientes, rotacionar, conferir que todas as
   leituras voltam corretas e que não há mais `v1:` em nenhuma coluna.
2. Smoke test em staging com cópia recente do banco prod.
3. Só então agendar prod, com janela de manutenção comunicada e plano de
   rollback (manter v1 disponível até zero linhas v1 confirmado).
