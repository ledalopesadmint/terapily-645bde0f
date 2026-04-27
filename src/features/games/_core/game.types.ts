/**
 * Contrato estável de qualquer jogo terapêutico do Terapily.
 *
 * REGRA FUTURE-PROOF: este shape é a interface entre o core (multi-tenant,
 * audit, magic link) e cada jogo individual. Quando novos jogos forem
 * adicionados na S3+, eles implementam este contrato sem refatorar o core.
 *
 * Status S1: tipos definidos, implementação real em S3-S4.
 *
 * MODOS DE USO (delivery_mode) — todos legítimos:
 * - "in_session"  → terapeuta aplica a atividade ao vivo, junto com o paciente
 * - "shared_link" → terapeuta prescreve como tarefa de casa via magic link
 * - "both"        → aplicou em sessão E também compartilhou pra casa
 *
 * Em todos os modos: paciente NUNCA cria conta. Resultado vai pro perfil
 * dele dentro do workspace do terapeuta.
 */

export type DeliveryMode = "in_session" | "shared_link" | "both";

export interface GameSession {
  id: string;
  game_id: string;
  workspace_id: string;
  therapist_id: string;
  patient_id: string;                // sempre — relatório vai pro perfil dele
  delivery_mode: DeliveryMode;
  status: "pending" | "in_progress" | "completed" | "abandoned";
  // Magic link só existe quando delivery_mode != "in_session"
  shareable_token_hash?: string;     // hash, nunca o token cru
  expires_at?: string;               // ISO timestamp; opcional
  prescribed_at?: string;            // quando virou tarefa de casa
  prescribed_by?: string;            // therapist_id que prescreveu (multi-therapist no Practice)
  due_at?: string;                   // prazo opcional
  created_at: string;
  started_at?: string;               // quando o paciente abriu de fato
  completed_at?: string;
}

export interface GameResult<TData = unknown> {
  session_id: string;
  data: TData;                       // payload bruto (criptografado via encryptPHI se PHI)
  summary: string;                   // 1-2 linhas pré-interpretadas pro terapeuta
  /**
   * Dado clínico estruturado — o coração do diferencial defensável.
   * O terapeuta usa isso pra fundamentar evolução clínica com evidência,
   * não com "achei que melhorou".
   */
  clinical_signals: {
    patterns_identified: string[];                     // ex: ["evitação reforçada", "loop catastrófico"]
    cbt_concepts_touched: string[];                    // ex: ["pensamento automático", "reestruturação"]
    intensity_indicators?: Record<string, number>;     // ex: { ansiedade_pre: 7, ansiedade_pos: 4 }
  };
  metrics: Record<string, number | string>;            // tempo total, num_clicks, etc
  report_pdf_eligible: boolean;                        // se gera PDF baixável (WhatsApp, email)
  completed_at: string;
}

export interface GameEvent {
  session_id: string;
  event_type: string;                // ex: "step_completed", "answer_chosen"
  payload: Record<string, unknown>;
  occurred_at: string;
}

/**
 * Contrato que cada jogo individual implementa.
 * Ficará em /features/games/{nome-jogo}/index.ts a partir da S3.
 *
 * Os campos clínicos (cbt_model, target_symptoms, evidence_base) sustentam
 * a promessa "não é genérico, é cientificamente fundamentado".
 */
export interface GameDefinition<TData = unknown> {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  // Classificação clínica (diferencial científico)
  cbt_model: string;                                       // ex: "Beck cognitive model", "Exposure & response prevention"
  target_symptoms: string[];                               // ex: ["anxiety", "panic", "avoidance"]
  age_range: { min: number; max: number };                 // ex: { min: 12, max: 99 }
  evidence_base: string;                                   // ref científica, ex: "Beck (1976), Clark (1986)"
  // Que modos de entrega esse jogo suporta — nem todo jogo serve pra in-session
  supported_delivery_modes: DeliveryMode[];
  // Lazy import obrigatório pra manter bundle leve
  component: () => Promise<{ default: React.ComponentType<GamePlayerProps<TData>> }>;
  summarize: (data: TData) => string;
  hasPHI: boolean;                                         // se true, dados são criptografados via encryptPHI
}

export interface GamePlayerProps<TData = unknown> {
  session: GameSession;
  onProgress: (event: Omit<GameEvent, "session_id" | "occurred_at">) => void;
  onComplete: (result: Omit<GameResult<TData>, "session_id" | "completed_at">) => void;
}

/**
 * Relatório baixável gerado a partir de um GameResult completo.
 * Implementação real em S3 — aqui só o contrato.
 *
 * Fluxo: paciente termina atividade → backend gera ActivityReport →
 * terapeuta visualiza no perfil do paciente → opcionalmente baixa PDF
 * e compartilha pelo canal que já usa (WhatsApp, email, impressão).
 */
export interface ActivityReport {
  id: string;
  session_id: string;
  patient_id: string;
  workspace_id: string;
  generated_at: string;
  pdf_url?: string;                                        // populated só quando PDF for renderizado (S3+)
  shared_via?: "download" | "email" | "link" | null;       // como o terapeuta compartilhou
}
