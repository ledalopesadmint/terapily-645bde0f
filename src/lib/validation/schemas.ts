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

// Date como string ISO (YYYY-MM-DD). Mantido como texto até o decrypt — o
// banco nunca vê como date pra não criar índice acidental sobre PHI.
const phiDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .transform((v) => v)
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const patientCreateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Required")
    .max(80, "Max 80 chars"),
  initials: z
    .string()
    .trim()
    .min(1, "Required")
    .max(6, "Max 6 chars")
    .regex(/^[\p{L}\p{N} .'-]+$/u, "Only letters and spaces"),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  assigned_therapist_id: z.string().uuid().optional(), // default = caller
  // PHI
  full_name: phiString(200),
  email: phiString(255),
  phone: phiString(40),
  date_of_birth: phiDate,
  intake_notes: phiString(4000),
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

