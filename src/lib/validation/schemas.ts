/**
 * Schemas Zod compartilhados client + server.
 *
 * REGRA FUTURE-PROOF: toda mutação (form, server function) usa o MESMO schema.
 * Nunca duplicar validação client-only — o servidor é a fonte da verdade.
 */
import { z } from "zod";

// Locales suportados (PT-BR padrão, expansão futura)
export const localeSchema = z.enum(["pt-BR", "en-US", "es-ES"]);
export type Locale = z.infer<typeof localeSchema>;

// Timezone: validação leve (formato IANA)
export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z_/+-]+$/, "Timezone inválido");

// Profile — campos opcionais conforme decisão da S1
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, "Nome muito curto").max(120),
  country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  license_number: z.string().max(64).optional().nullable(),
  npi: z.string().max(32).optional().nullable(),
  locale: localeSchema.default("pt-BR"),
  timezone: timezoneSchema.default("America/Sao_Paulo"),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// Auth
export const emailSchema = z.string().email("E-mail inválido").max(255);
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128);

export const signupSchema = z.object({
  full_name: z.string().min(2, "Nome muito curto").max(120),
  email: emailSchema,
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha obrigatória"),
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
  name: z.string().min(2, "Nome muito curto").max(80),
});
export type WorkspaceUpdate = z.infer<typeof workspaceUpdateSchema>;
