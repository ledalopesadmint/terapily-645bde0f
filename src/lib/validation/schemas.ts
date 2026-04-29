/**
 * Shared Zod schemas — client + server.
 *
 * FUTURE-PROOF RULE: every mutation (form, server function) uses the SAME
 * schema. Never duplicate client-only validation — the server is the source
 * of truth.
 *
 * App copy is currently mixed (EN public-facing auth, PT internal app until
 * S5). Validation messages are written in EN to match the auth surface that
 * end-users see today; internal app screens render their own labels.
 */
import { z } from "zod";

// Supported locales (PT-BR default, future expansion)
export const localeSchema = z.enum(["pt-BR", "en-US", "es-ES"]);
export type Locale = z.infer<typeof localeSchema>;

// Timezone: light validation (IANA format)
export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z_/+-]+$/, "Invalid timezone");

// Profile — optional fields per S1 decision
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, "Name is too short").max(120),
  country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  license_number: z.string().max(64).optional().nullable(),
  npi: z.string().max(32).optional().nullable(),
  locale: localeSchema.default("pt-BR"),
  timezone: timezoneSchema.default("America/Sao_Paulo"),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// Auth
export const emailSchema = z.string().email("Invalid email").max(255);
export const passwordSchema = z
  .string()
  .min(8, "Minimum 8 characters")
  .max(128);

export const signupSchema = z.object({
  full_name: z.string().min(2, "Name is too short").max(120),
  email: emailSchema,
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

// Workspace
export const workspaceUpdateSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
});
export type WorkspaceUpdate = z.infer<typeof workspaceUpdateSchema>;

// =============================================================================
// Patients (S2)
// =============================================================================
// Identificação NÃO-PHI (display_name, initials, tags) — pode ir em ILIKE/UI.
// PHI (full_name, email, phone, dob, intake_notes) — cifrado AES-GCM no server.
// Schema é único pra client e server; server cifra antes de gravar.

const patientStatus = z.enum(["active", "archived"]);
export type PatientStatus = z.infer<typeof patientStatus>;

const phiString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional();

// (Removidos phiDate e intake_notes — não usamos data de nascimento nem
// observações iniciais. Prontuário fica no EHR do terapeuta.)

// Apelido / pseudônimo. NÃO é PHI: vai em texto plano, índice, busca e logs.
// Por isso bloqueamos formatos que normalmente carregam identidade real:
// email, telefone, CPF/SSN. Nome composto longo é só um aviso visual no form
// (não bloqueia, porque "Ana M." é legítimo e "Maria de Lourdes" também pode
// ser pseudônimo escolhido pela terapeuta).
const looksLikeEmail = /\S+@\S+\.\S+/;
const looksLikePhone = /(?:\+?\d[\d\s().-]{7,})/;
const looksLikeDocId = /\b\d{3}[.\-\s]?\d{3}[.\-\s]?\d{3}[-\s]?\d{2}\b|\b\d{3}-\d{2}-\d{4}\b/;
// Datas em formatos comuns (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY).
// Tags são pra categorização clínica genérica ("ansiedade", "adolescente"),
// nunca pra marcar dia de sessão ou data de nascimento.
const looksLikeDate =
  /\b(?:\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b/;

// =============================================================================
// Tags (não-PHI, mas precisam ser genéricas — não podem virar coluna paralela
// de identificação. Validação compartilhada entre client e server.)
// =============================================================================
export const TAGS_INVALID_MESSAGE =
  "Use tags genéricas. Não inclua nome, email, telefone, data ou informação clínica identificável.";

// Mensagens específicas por motivo — ajudam a terapeuta a entender QUAL regra
// foi violada (e não só "tag inválida"). Todas referenciam o mesmo princípio:
// tag é categoria clínica reutilizável ("ansiedade", "adolescente"),
// não identificador do paciente.
export const TAG_REASON = {
  email:
    "Tags não podem conter email. Use uma categoria genérica (ex.: ansiedade, adolescente, casal).",
  phone:
    "Tags não podem conter telefone. Use uma categoria genérica (ex.: ansiedade, adolescente, casal).",
  docId:
    "Tags não podem conter CPF, SSN ou número de documento. Use uma categoria genérica (ex.: ansiedade, adolescente, casal).",
  date:
    "Tags não podem conter data (de nascimento, sessão, etc). Use uma categoria genérica (ex.: ansiedade, adolescente, casal).",
  tooManyWords:
    'Tags devem ter no máximo 2 palavras (ex.: "ansiedade social"). Para nome completo do paciente, use o campo "Nome completo" abaixo.',
  tooLong:
    "Tags devem ter no máximo 30 caracteres. Encurte ou divida em duas tags.",
} as const;

const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(30, TAG_REASON.tooLong)
  .refine((v) => !looksLikeEmail.test(v), TAG_REASON.email)
  .refine((v) => !looksLikePhone.test(v), TAG_REASON.phone)
  .refine((v) => !looksLikeDocId.test(v), TAG_REASON.docId)
  .refine((v) => !looksLikeDate.test(v), TAG_REASON.date)
  // Máximo 2 palavras (ex: "ansiedade social" OK, "Maria de Lourdes" não).
  .refine(
    (v) => v.split(/\s+/).filter(Boolean).length <= 2,
    TAG_REASON.tooManyWords,
  );

export const patientTagsSchema = z
  .array(tagSchema)
  .max(10, "Máximo de 10 tags por paciente.")
  .default([])
  // Normaliza: remove duplicadas mantendo ordem.
  .transform((arr) => Array.from(new Set(arr)));

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Obrigatório")
  .max(80, "Máx. 80 caracteres")
  .refine((v) => !looksLikeEmail.test(v), {
    message: "Apelido não pode ser um email. Use só um identificador curto.",
  })
  .refine((v) => !looksLikePhone.test(v), {
    message: "Apelido não pode ser um telefone.",
  })
  .refine((v) => !looksLikeDocId.test(v), {
    message: "Apelido não pode conter CPF, SSN ou documento.",
  });

export const patientCreateSchema = z.object({
  display_name: displayNameSchema,
  initials: z
    .string()
    .trim()
    .min(1, "Required")
    .max(6, "Max 6 chars")
    .regex(/^[\p{L}\p{N} .'-]+$/u, "Only letters and spaces"),
  tags: patientTagsSchema,
  assigned_therapist_id: z.string().uuid().optional(), // default = caller
  // PHI (cifrado AES-GCM-256 antes de gravar)
  full_name: phiString(200),
  email: phiString(255),
  phone: phiString(40),
});
export type PatientCreate = z.infer<typeof patientCreateSchema>;
export type PatientCreateInput = z.input<typeof patientCreateSchema>;

export const patientUpdateSchema = patientCreateSchema.extend({
  id: z.string().uuid(),
});
export type PatientUpdate = z.infer<typeof patientUpdateSchema>;

export const patientIdSchema = z.object({ id: z.string().uuid() });

export const patientListSchema = z.object({
  status: patientStatus.optional(),
  search: z.string().trim().max(80).optional(), // só bate em display_name (não-PHI)
  limit: z.number().int().min(1).max(100).default(50),
});
export type PatientListInput = z.infer<typeof patientListSchema>;

