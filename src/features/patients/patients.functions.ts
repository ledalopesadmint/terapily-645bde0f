/**
 * Server functions de pacientes — S2/Terça.
 *
 * Padrão (igual `profile.functions.ts`):
 *   Zod → requireSupabaseAuth → cifrar PHI → RLS → withAudit().
 *
 * REGRAS DURAS:
 *  - Todo campo PHI vai cifrado via `encryptPHIServer` ANTES do INSERT/UPDATE.
 *  - Leitura decifra com `decryptPHIServer`. Falha de decrypt vira null
 *    (registro lido mas com PHI ilegível) — preferível a quebrar a tela toda.
 *  - `withAudit.metadata` NUNCA contém PHI: só ids, enums, contagens.
 *  - Soft delete via update `deleted_at = now()`. DELETE bloqueado pela RLS.
 *  - Gating de plano: checa `subscriptions.limits.max_patients` no servidor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { withAudit, recordAudit } from "@/features/audit/audit.server";
import {
  encryptPHIServer,
  decryptPHIServer,
} from "@/lib/crypto/encryption.server";
import {
  patientCreateSchema,
  patientUpdateSchema,
  patientIdSchema,
  patientListSchema,
  type PatientCreate,
  type PatientUpdate,
} from "@/lib/validation/schemas";

// ----- shape devolvido pro client (PHI já decifrado) -----------------------
export interface PatientDTO {
  id: string;
  workspace_id: string;
  assigned_therapist_id: string;
  display_name: string;
  initials: string;
  tags: string[];
  status: "active" | "archived";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // PHI decifrado (null se vazio ou falha de decrypt)
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

// Colunas selecionadas — sempre as mesmas pra evitar leak acidental.
const SELECT_COLS =
  "id, workspace_id, assigned_therapist_id, display_name, initials, tags, status, archived_at, created_at, updated_at, full_name_encrypted, email_encrypted, phone_encrypted";

type PatientRow = {
  id: string;
  workspace_id: string;
  assigned_therapist_id: string;
  display_name: string;
  initials: string;
  tags: string[];
  status: "active" | "archived";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  full_name_encrypted: string | null;
  email_encrypted: string | null;
  phone_encrypted: string | null;
};

async function safeDecrypt(value: string | null): Promise<string | null> {
  if (!value) return null;
  try {
    const out = await decryptPHIServer(value);
    return out === "" ? null : out;
  } catch (err) {
    console.error("[patients] decrypt failed", err);
    return null;
  }
}

async function rowToDTO(row: PatientRow): Promise<PatientDTO> {
  const [full_name, email, phone] = await Promise.all([
    safeDecrypt(row.full_name_encrypted),
    safeDecrypt(row.email_encrypted),
    safeDecrypt(row.phone_encrypted),
  ]);

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    assigned_therapist_id: row.assigned_therapist_id,
    display_name: row.display_name,
    initials: row.initials,
    tags: row.tags ?? [],
    status: row.status,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    full_name,
    email,
    phone,
  };
}

async function encryptOrNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return encryptPHIServer(v);
}

async function encryptPatientPayload(data: PatientCreate | PatientUpdate) {
  const [full_name_encrypted, email_encrypted, phone_encrypted] =
    await Promise.all([
      encryptOrNull(data.full_name ?? null),
      encryptOrNull(data.email ?? null),
      encryptOrNull(data.phone ?? null),
    ]);

  return {
    display_name: data.display_name,
    initials: data.initials,
    tags: data.tags,
    full_name_encrypted,
    email_encrypted,
    phone_encrypted,
  };
}

// =============================================================================
// LIST
// =============================================================================
export const listPatients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patientListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let query = supabase
      .from("patients")
      .select(SELECT_COLS)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status) query = query.eq("status", data.status);
    if (data.search && data.search.length > 0) {
      // Busca SÓ em display_name (não-PHI). PHI nunca em ILIKE.
      query = query.ilike("display_name", `%${data.search}%`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("listPatients failed", error);
      throw new Error("Não foi possível carregar os pacientes.");
    }

    const patients = await Promise.all((rows ?? []).map((r) => rowToDTO(r as PatientRow)));
    return { patients };
  });

// =============================================================================
// GET (single)
// =============================================================================
export const getPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patientIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: row, error } = await supabase
      .from("patients")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("getPatient failed", error);
      throw new Error("Não foi possível abrir o paciente.");
    }
    if (!row) throw new Error("Paciente não encontrado.");

    return { patient: await rowToDTO(row as PatientRow) };
  });

// =============================================================================
// CREATE
// =============================================================================
export const createPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patientCreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Resolve workspace ativo do usuário (membro vivo).
    const { data: membership, error: memberErr } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberErr || !membership) {
      throw new Error("Workspace não encontrado.");
    }
    const workspace_id = membership.workspace_id;

    // 2. Gating por plano — limite real consultado no servidor.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("limits, status, tier")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const limitsObj = (sub?.limits ?? {}) as Record<string, unknown>;
    const maxPatients = typeof limitsObj.max_patients === "number" ? limitsObj.max_patients : null;

    if (maxPatients != null) {
      const { count: activeCount, error: countErr } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id)
        .is("deleted_at", null)
        .eq("status", "active");

      if (countErr) {
        console.error("count patients failed", countErr);
        throw new Error("Não foi possível verificar o limite do plano.");
      }
      if ((activeCount ?? 0) >= maxPatients) {
        throw new Error(
          `Você atingiu o limite de ${maxPatients} pacientes ativos do seu plano. Arquive um ou faça upgrade.`,
        );
      }
    }

    // 3. Cifra PHI fora da transação (Web Crypto, rápido).
    const encrypted = await encryptPatientPayload(data);
    const assigned_therapist_id = data.assigned_therapist_id ?? userId;

    // 4. INSERT (RLS + with_check garantem todas as regras).
    return withAudit(
      {
        actorId: userId,
        workspaceId: workspace_id,
        action: "patient.create_attempt",
        resourceType: "patient",
        // Sem PHI no metadata — só estrutura.
        metadata: {
          assigned_therapist_id,
          tags_count: data.tags.length,
          has_email: encrypted.email_encrypted != null,
          has_phone: encrypted.phone_encrypted != null,
        },
      },
      async () => {
        const { data: inserted, error } = await supabase
          .from("patients")
          .insert({
            workspace_id,
            assigned_therapist_id,
            created_by: userId,
            ...encrypted,
          })
          .select(SELECT_COLS)
          .single();

        if (error) {
          console.error("createPatient failed", error);
          throw new Error("Não foi possível criar o paciente.");
        }

        return { patient: await rowToDTO(inserted as PatientRow) };
      },
    );
  });

// =============================================================================
// UPDATE
// =============================================================================
export const updatePatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patientUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, assigned_therapist_id, ...rest } = data;

    const encrypted = await encryptPatientPayload({ ...rest, assigned_therapist_id });

    const updatePayload: Database["public"]["Tables"]["patients"]["Update"] = { ...encrypted };
    if (assigned_therapist_id) updatePayload.assigned_therapist_id = assigned_therapist_id;

    return withAudit(
      {
        actorId: userId,
        action: "patient.update_attempt",
        resourceType: "patient",
        resourceId: id,
        metadata: {
          // PII-safe: só nomes de campos editáveis (não os valores).
          fields: Object.keys(updatePayload),
        },
      },
      async () => {
        const { data: updated, error } = await supabase
          .from("patients")
          .update(updatePayload)
          .eq("id", id)
          .is("deleted_at", null)
          .select(SELECT_COLS)
          .maybeSingle();

        if (error) {
          console.error("updatePatient failed", error);
          throw new Error("Não foi possível salvar.");
        }
        if (!updated) throw new Error("Paciente não encontrado ou sem permissão.");

        return { patient: await rowToDTO(updated as PatientRow) };
      },
    );
  });

// =============================================================================
// REVEAL CONTACT (copiar email/telefone via clipboard)
// =============================================================================
// Descriptografa UM campo de contato sob demanda. Auditamos cada chamada
// (sem o valor, só UUID + tipo de campo). UI faz auto-clear do clipboard.
const revealContactSchema = z.object({
  id: z.string().uuid(),
  field: z.enum(["email", "phone"]),
});

export const revealPatientContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => revealContactSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const col = data.field === "email" ? "email_encrypted" : "phone_encrypted";
    const { data: row, error } = await supabase
      .from("patients")
      .select(`id, workspace_id, ${col}`)
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !row) {
      throw new Error("Paciente não encontrado.");
    }

    const encrypted = (row as Record<string, string | null>)[col];
    const value = await safeDecrypt(encrypted ?? null);
    if (!value) {
      throw new Error(
        data.field === "email"
          ? "Sem email cadastrado."
          : "Sem telefone cadastrado.",
      );
    }

    await recordAudit({
      actorId: userId,
      workspaceId: (row as { workspace_id: string }).workspace_id,
      action: "patient.phi_copied",
      resourceType: "patient",
      resourceId: data.id,
      metadata: { field: data.field },
    });

    return { value };
  });

// =============================================================================
// ARCHIVE / RESTORE / SOFT DELETE
// =============================================================================
const statusActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["archive", "restore_active", "soft_delete"]),
});

export const setPatientLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const patch: Database["public"]["Tables"]["patients"]["Update"] =
      data.action === "archive"
        ? { status: "archived", archived_at: new Date().toISOString() }
        : data.action === "restore_active"
          ? { status: "active", archived_at: null }
          : { deleted_at: new Date().toISOString() };

    return withAudit(
      {
        actorId: userId,
        action: `patient.lifecycle_${data.action}`,
        resourceType: "patient",
        resourceId: data.id,
        metadata: { action: data.action },
      },
      async () => {
        const { data: updated, error } = await supabase
          .from("patients")
          .update(patch)
          .eq("id", data.id)
          .is("deleted_at", null)
          .select("id, status, archived_at, deleted_at")
          .maybeSingle();

        if (error) {
          console.error("setPatientLifecycle failed", error);
          throw new Error("Ação não permitida.");
        }
        if (!updated) throw new Error("Paciente não encontrado ou sem permissão.");

        return { ok: true };
      },
    );
  });
