/**
 * Helper server-only que normaliza a leitura de plano/billing.
 *
 * REGRAS DURAS:
 *  - SERVER-ONLY. Nunca importar em componente, hook ou loader isomórfico.
 *    O sufixo `.server.ts` é bloqueado pelo import-protection do Vite no
 *    bundle de cliente.
 *  - Nunca lança quando a subscription não existe — devolve um plano "trial"
 *    seguro com `max_patients = 5` (default histórico do app).
 *  - Aplica defaults conservadores quando algum campo do JSONB `limits` está
 *    ausente. NUNCA promove um plano por ausência de campo.
 *  - É a ÚNICA porta de entrada pra ler `subscriptions.limits` em features
 *    que não são billing. Code paths em billing.functions.ts continuam
 *    podendo ler diretamente porque já trabalham no domínio billing.
 *  - Não expõe secrets — só lê do banco com o cliente que receber.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PlanTier = "trial" | "solo" | "basic" | "practice" | "clinic";
export type PlanStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "incomplete";

export interface WorkspacePlan {
  tier: PlanTier;
  status: PlanStatus;
  /** null = ilimitado (Clinic). Trial/Basic/Practice sempre devolvem número. */
  max_patients: number | null;
  /** Reservado pra S3+. null = ilimitado, undefined = não definido pelo plano. */
  max_activities: number | null;
  /** Reservado pra S3+ (Compliance Reports do Practice). */
  max_reports: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  /** True quando o trial expirou e ainda não houve checkout. */
  trial_expired: boolean;
}

/** Defaults de limites por tier — fonte única da verdade no servidor. */
const TIER_LIMITS: Record<
  PlanTier,
  { max_patients: number | null; max_activities: number | null; max_reports: number | null }
> = {
  // Trial novo terapeuta — número conservador. Coincide com o
  // comportamento histórico (subscription criada pelo handle_new_user
  // com tier=solo). Mantemos `solo` como apelido de trial.
  trial: { max_patients: 5, max_activities: null, max_reports: 0 },
  solo: { max_patients: 5, max_activities: null, max_reports: 0 },
  basic: { max_patients: 20, max_activities: null, max_reports: 0 },
  practice: { max_patients: 50, max_activities: null, max_reports: null },
  clinic: { max_patients: null, max_activities: null, max_reports: null },
};

const DEFAULT_PLAN: WorkspacePlan = {
  tier: "trial",
  status: "trialing",
  max_patients: TIER_LIMITS.trial.max_patients,
  max_activities: TIER_LIMITS.trial.max_activities,
  max_reports: TIER_LIMITS.trial.max_reports,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  trial_expired: false,
};

function normalizeTier(raw: string | null | undefined): PlanTier {
  switch (raw) {
    case "basic":
    case "practice":
    case "clinic":
    case "solo":
    case "trial":
      return raw;
    default:
      return "trial";
  }
}

function normalizeStatus(raw: string | null | undefined): PlanStatus {
  switch (raw) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "paused":
    case "incomplete":
      return raw;
    default:
      return "trialing";
  }
}

function pickNumberOrNull(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null) return null as unknown as undefined; // explicit null = unlimited
  return undefined;
}

/**
 * Lê e normaliza o plano efetivo de um workspace.
 *
 * Prioridade de fontes pra cada limite:
 *   1. `subscriptions.limits.<key>` (override por workspace, raro)
 *   2. defaults do tier em `TIER_LIMITS`
 *
 * Sem subscription → retorna trial seguro.
 *
 * @param supabase Client autenticado (auth-middleware) ou admin. Como apenas
 *   leitura de subscription do próprio workspace, RLS já basta.
 */
export async function getWorkspacePlan(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<WorkspacePlan> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "tier, status, limits, stripe_customer_id, stripe_subscription_id, trial_ends_at",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("[plan.server] failed to read subscription", error);
    return { ...DEFAULT_PLAN };
  }

  if (!data) return { ...DEFAULT_PLAN };

  const tier = normalizeTier(data.tier as string | null);
  const status = normalizeStatus(data.status as string | null);
  const tierDefaults = TIER_LIMITS[tier];
  const limitsObj = (data.limits ?? {}) as Record<string, unknown>;

  const overrideMaxPatients = pickNumberOrNull(limitsObj.max_patients);
  const overrideMaxActivities = pickNumberOrNull(limitsObj.max_activities);
  const overrideMaxReports = pickNumberOrNull(limitsObj.max_reports);

  const trialEndsAt = data.trial_ends_at
    ? new Date(data.trial_ends_at as string)
    : null;
  const trialExpired =
    status === "trialing" && trialEndsAt != null && trialEndsAt.getTime() < Date.now();

  return {
    tier,
    status,
    max_patients:
      overrideMaxPatients !== undefined
        ? overrideMaxPatients
        : tierDefaults.max_patients,
    max_activities:
      overrideMaxActivities !== undefined
        ? overrideMaxActivities
        : tierDefaults.max_activities,
    max_reports:
      overrideMaxReports !== undefined
        ? overrideMaxReports
        : tierDefaults.max_reports,
    stripe_customer_id: (data.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id: (data.stripe_subscription_id as string | null) ?? null,
    trial_expired: trialExpired,
  };
}
