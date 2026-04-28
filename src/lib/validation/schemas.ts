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
