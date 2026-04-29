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
 *  - Gating de plano: SEMPRE via `getWorkspacePlan()`. NUNCA leia
 *    `subscriptions.limits` direto neste arquivo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { withAudit, recordAudit, parseOrAuditValidation } from "@/features/audit/audit.server";
import { getWorkspacePlan } from "@/features/billing/plan.server";
import {
  encryptPHIServer,
  decryptPHIServer,
} from "@/lib/crypto/encryption.server";
import { logServerError } from "@/lib/logger.server";
import {
  patientCreateSchema,
  patientUpdateSchema,
  patientIdSchema,
  patientListSchema,
  type PatientCreate,
  type PatientUpdate,
} from "@/lib/validation/schemas";
import {
  LIMIT_REACHED_PREFIX,
  type PatientDTO,
} from "./patients.types";

// Re-export pra não quebrar imports antigos (`from "patients.functions"`).
export type { PatientDTO } from "./patients.types";

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
    logServerError("patient.decrypt", err);
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
      logServerError("listPatients", error);
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
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("patients")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      logServerError("getPatient", error);
      throw new Error("Não foi possível abrir o paciente.");
    }
    if (!row) throw new Error("Paciente não encontrado.");

    // Access log de PHI: só registra DEPOIS que a leitura foi autorizada
    // pela RLS (caso contrário row seria null). Metadata PII-safe — só IDs.
    // listPatients NÃO registra (evita poluição do audit por scrolling).
    const patientRow = row as PatientRow;
    await recordAudit({
      actorId: userId,
      workspaceId: patientRow.workspace_id,
      action: "patient.viewed",
      resourceType: "patient",
      resourceId: patientRow.id,
      metadata: { patient_id: patientRow.id },
    });

    return { patient: await rowToDTO(patientRow) };
  });

// =============================================================================
// CREATE
// =============================================================================
export const createPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // Passthrough: validação real acontece no handler com audit de validation.failed.
  .inputValidator((input: unknown) => input as PatientCreate)
  .handler(async ({ data: rawInput, context }) => {
    const { supabase, userId } = context;
    // Valida com auditoria de validation.failed (PII-safe: só nomes de campos).
    const data = await parseOrAuditValidation(
      patientCreateSchema,
      rawInput,
      { feature: "patients", actorId: userId },
    );

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

    // 2. Gating por plano — limite real consultado no servidor via helper
    //    centralizado. NUNCA leia `subscriptions.limits` direto aqui.
    //    REGRA (decidida 2026-04-29): pacientes ARQUIVADOS contam como vaga
    //    ocupada. Só excluídos (deleted_at) liberam vaga.
    const plan = await getWorkspacePlan(supabase, workspace_id);
    const maxPatients = plan.max_patients;
    const tier = plan.tier;

    if (maxPatients != null) {
      const { count: usedCount, error: countErr } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id)
        .is("deleted_at", null);

      if (countErr) {
        logServerError("createPatient.count", countErr);
        throw new Error("Não foi possível verificar o limite do plano.");
      }
      const currentCount = usedCount ?? 0;
      if (currentCount >= maxPatients) {
        // Audit blind-spot fix: registra a tentativa bloqueada antes de lançar.
        // Metadata PII-safe: só tier, números e nada de identificação.
        await recordAudit({
          actorId: userId,
          workspaceId: workspace_id,
          action: "patient.limit_reached",
          resourceType: "patient",
          metadata: {
            tier,
            max_patients: maxPatients,
            current_count: currentCount,
            attempted_count: currentCount + 1,
          },
        });
        // Marker estruturado pra UI distinguir "limite atingido" de outros
        // erros e abrir o modal contextual de upgrade/waitlist.
        throw new Error(
          `${LIMIT_REACHED_PREFIX}:${tier}:${maxPatients}`,
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
          // Trigger BEFORE INSERT (enforce_patient_limit) lança a mensagem
          // estruturada __LIMIT_REACHED__:tier:max. Preserva pra UI conseguir
          // abrir o modal de upgrade mesmo se a checagem app-level acima
          // estiver com cache stale.
          if (error.message?.startsWith(LIMIT_REACHED_PREFIX)) {
            throw new Error(error.message);
          }
          logServerError("createPatient", error);
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
  // Passthrough: validação real acontece no handler com audit de validation.failed.
  .inputValidator((input: unknown) => input as PatientUpdate)
  .handler(async ({ data: rawInput, context }) => {
    const { supabase, userId } = context;
    const data = await parseOrAuditValidation(
      patientUpdateSchema,
      rawInput,
      { feature: "patients", actorId: userId },
    );
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
          logServerError("updatePatient", error);
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
          logServerError("setPatientLifecycle", error);
          throw new Error("Ação não permitida.");
        }
        if (!updated) throw new Error("Paciente não encontrado ou sem permissão.");

        return { ok: true };
      },
    );
  });

// =============================================================================
// PATIENT COUNT (pra banner 80% e modal de limite)
// =============================================================================
export const getPatientUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) return { used: 0, max: null, tier: "trial" as string };

    const [plan, { count }] = await Promise.all([
      getWorkspacePlan(supabase, membership.workspace_id),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspace_id)
        .is("deleted_at", null),
    ]);

    return {
      used: count ?? 0,
      max: plan.max_patients,
      tier: plan.tier as string,
    };
  });

// =============================================================================
// LIST DELETED (janela de 30 dias, restauráveis)
// =============================================================================
export const listDeletedPatients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // RLS já filtra: só excluídos sem purge dentro da janela visíveis ao
    // owner ou ao therapist assigned (policy "patients: deleted read window").
    const { data, error } = await supabase
      .from("patients")
      .select(
        "id, workspace_id, assigned_therapist_id, display_name, initials, tags, status, deleted_at, created_at",
      )
      .not("deleted_at", "is", null)
      .is("purged_at", null)
      .order("deleted_at", { ascending: false })
      .limit(100);

    if (error) {
      logServerError("listDeletedPatients", error);
      throw new Error("Não foi possível carregar os excluídos.");
    }

    const now = Date.now();
    const items = (data ?? []).map((row) => {
      const deletedAt = new Date(row.deleted_at as string).getTime();
      const expiresAt = deletedAt + 30 * 24 * 60 * 60 * 1000;
      const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));
      return {
        id: row.id,
        display_name: row.display_name,
        initials: row.initials,
        tags: row.tags ?? [],
        deleted_at: row.deleted_at as string,
        days_left: daysLeft,
      };
    });

    return { items };
  });

// =============================================================================
// RESTORE (chama função SECURITY DEFINER do banco)
// =============================================================================
export const restorePatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: result, error } = await supabase.rpc("restore_patient", {
      _patient_id: data.id,
    });

    if (error) {
      logServerError("restorePatient", error);
      throw new Error("Não foi possível restaurar.");
    }

    await recordAudit({
      actorId: userId,
      action: "patient.restored_by_user",
      resourceType: "patient",
      resourceId: data.id,
      metadata: {},
    });

    return { ok: true, patient: result };
  });

// =============================================================================
// CLINIC WAITLIST (Practice cheio → entra na lista de espera)
// =============================================================================
const waitlistSchema = z.object({
  email: z.string().email(),
  projected_patient_count: z.number().int().min(1).max(10000).optional(),
  notes: z.string().max(500).optional(),
});

export const joinClinicWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => waitlistSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .eq("role", "owner")
      .is("deleted_at", null)
      .maybeSingle();

    if (!membership) {
      throw new Error("Apenas o dono do workspace pode entrar na lista.");
    }

    const { error } = await supabase.from("clinic_waitlist").insert({
      workspace_id: membership.workspace_id,
      created_by: userId,
      email: data.email,
      projected_patient_count: data.projected_patient_count ?? null,
      notes: data.notes ?? null,
    });

    if (error) {
      // Unique violation = já está na lista — tratamos como sucesso.
      if (error.code === "23505") {
        return { ok: true, alreadyOnList: true };
      }
      logServerError("joinClinicWaitlist", error);
      throw new Error("Não foi possível entrar na lista de espera.");
    }

    await recordAudit({
      actorId: userId,
      workspaceId: membership.workspace_id,
      action: "clinic_waitlist.joined",
      resourceType: "clinic_waitlist",
      metadata: { has_projection: data.projected_patient_count != null },
    });

    return { ok: true, alreadyOnList: false };
  });
