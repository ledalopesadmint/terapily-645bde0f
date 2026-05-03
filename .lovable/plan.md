
# Links Efêmeros + Countdown de Expiração — Implementação Imediata

## Resumo

Criar a terceira categoria de links (`/e/$token`) para atividades efêmeras (Cognitive Mapping v2.0 e futuras), com dados retidos por 24h após submit, countdown visual no box da atividade, consentimento obrigatório do terapeuta, e audit trail completo para blindagem jurídica.

---

## 1. Banco de dados (migração)

### Novas tabelas

**`ephemeral_activities`** — Registro do link efêmero:
- `id`, `workspace_id`, `patient_id`, `activity_id`, `assigned_by`
- `token_hash` (SHA-256, nunca o token cru)
- `token_expires_at` (expiração do acesso ao link)
- `status` enum: `pending`, `opened`, `completed`, `expired`, `revoked`
- `therapist_consent_at` (timestamp do consentimento do terapeuta)
- `therapist_consent_text_hash` (SHA-256 do texto aceito)
- `purge_after` (timestamp = `used_at + 24h`, calculado no submit)
- `used_at`, `completed_at`
- `pdf_downloaded_at` (último download)
- `pdf_download_count` (int, default 0)
- RLS: mesma lógica de `patient_activities` (workspace member + assigned therapist or owner)

**`ephemeral_responses`** — Dados temporários:
- `id`, `ephemeral_activity_id`, `workspace_id`, `patient_id`
- `response_data_encrypted` (text, nullable — será nullificado após 24h)
- `submitted_at`, `submitted_via`
- `purged_at` (timestamp de quando foi limpo)
- RLS: mesma lógica, SELECT only para terapeuta

### Novo enum
- `ephemeral_activity_status`: `pending`, `opened`, `completed`, `expired`, `revoked`, `purged`

### Triggers (SECURITY DEFINER)
- `audit_ephemeral_activity_change()` — registra `ephemeral.assigned`, `ephemeral.consent_acknowledged`, `ephemeral.status_changed`, `ephemeral.submitted`
- `audit_ephemeral_response_insert()` — registra `ephemeral.response_recorded`

### pg_cron job
- Roda a cada 15 minutos: `SELECT purge_expired_ephemeral_data()`
- Função `purge_expired_ephemeral_data()` (SECURITY DEFINER):
  - WHERE `purge_after < now()` AND `purged_at IS NULL` AND `response_data_encrypted IS NOT NULL`
  - SET `response_data_encrypted = NULL`, `purged_at = now()`
  - UPDATE `ephemeral_activities` SET `status = 'purged'`
  - INSERT audit log: `ephemeral.purged` (sem PHI, só UUIDs + timestamps)

---

## 2. Server functions

**`src/features/ephemeral/ephemeral.functions.ts`**:
- `assignEphemeralActivity` — cria registro, exige `therapist_consent_at` + `therapist_consent_text_hash`
- `getEphemeralActivity` — busca por patient_id (para listar no perfil)
- `revokeEphemeralActivity` — muda status para `revoked`
- `recordEphemeralPdfDownload` — incrementa contador + registra audit `ephemeral.pdf_downloaded`
- `recordEphemeralWarningShown` — registra audit `ephemeral.expiration_warning_shown`

**`src/features/ephemeral/ephemeral.server.ts`**:
- Helpers de banco (queries, validações)

**`src/features/ephemeral/ephemeral-public.functions.ts`**:
- `getEphemeralByToken` — rota pública para `/e/$token` (valida hash, verifica expiração)
- `submitEphemeralResponse` — salva response_data_encrypted, marca `used_at`, calcula `purge_after`

---

## 3. Rota pública `/e/$token`

**`src/routes/e.$token.tsx`** — Player público para atividades efêmeras:
- Consent gate (reutiliza `ConsentGate`)
- Player da atividade (Card Sort / Cognitive Mapping)
- Ao submeter: gera PDF visual do quadro + salva encrypted
- Mensagem pós-submit: "Suas respostas foram registradas. O terapeuta receberá o resultado."

---

## 4. Componente `EphemeralCountdownBadge`

**`src/features/ephemeral/components/EphemeralCountdownBadge.tsx`**:
- Props: `purgeAfter: string` (ISO timestamp), `onDownloadPdf: () => void`
- `useEffect` + `setInterval(1000)` — calcula diferença entre `now()` e `purgeAfter`
- Formatação: `XXh XXm XXs`
- Escala de cores (3 fases):
  - `>12h`: fundo sage-claro, texto sage-escuro, ícone relógio
  - `2h–12h`: fundo âmbar-claro, texto âmbar-escuro
  - `<2h`: fundo coral-claro, texto coral-escuro, animação pulse suave
  - `≤0`: fundo cinza, texto "Dados expirados", ícone cadeado, botão desabilitado
- Botão "Baixar PDF" integrado (atalho direto)
- Tooltip: "Após a expiração, os dados desta atividade serão permanentemente removidos e não poderão ser recuperados."
- Ao renderizar pela primeira vez: chama `recordEphemeralWarningShown` (1x por sessão, debounce)

### Toast de última hora
- Quando countdown atinge 1h restante: `toast.warning("Atividade [nome] expira em menos de 1h — baixe o PDF agora")`
- Disparado 1x (flag ref)

---

## 5. Integração no perfil do paciente

No `patients.$id.tsx`, na seção de atividades:
- Query adicional para `ephemeral_activities` do paciente
- Renderizar cards de atividades efêmeras com o `EphemeralCountdownBadge` (quando `status === 'completed'` e `purged_at IS NULL`)
- Cards de efêmeras purged: mostrar badge cinza "Dados expirados" sem botão de download

---

## 6. Modal de consentimento do terapeuta

Ao prescrever atividade efêmera (no `AssignActivityDialog` ou equivalente):
- Modal intermediário antes de confirmar:
  - Texto: "Entendo que os dados desta atividade serão permanentemente removidos 24 horas após o preenchimento pelo paciente, e que é minha responsabilidade baixar o resultado antes desse prazo."
  - Checkbox + botão "Concordo e prescrevo"
- Hash SHA-256 do texto salvo no `therapist_consent_text_hash`
- Audit log: `ephemeral.consent_acknowledged`

---

## 7. Memórias

Salvar `mem://features/ephemeral-links-architecture` com todas as regras, schema, audit events e política de 24h.

---

## Detalhes técnicos

- Todas as server functions usam `requireSupabaseAuth` middleware
- Rota `/e/$token` é pública (sem auth), mesma segurança do `/p/$token`
- PHI cifrado com AES-256 usando `PHI_ENCRYPTION_KEY` (já configurado)
- Audit logs nunca contêm PHI — apenas UUIDs, timestamps e contadores
- Código organizado em `src/features/ephemeral/` para manter separação clara
- pg_cron usa `purge_expired_ephemeral_data()` SECURITY DEFINER (sem acesso client)
