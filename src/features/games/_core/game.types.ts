/**
 * Contrato estável de qualquer jogo terapêutico do Terapily.
 *
 * REGRA FUTURE-PROOF: este shape é a interface entre o core (multi-tenant,
 * audit, magic link) e cada jogo individual. Quando novos jogos forem
 * adicionados na S3+, eles implementam este contrato sem refatorar o core.
 *
 * Status S1: tipos definidos, implementação real em S3-S4.
 */

export interface GameSession {
  id: string;
  game_id: string;
  workspace_id: string;
  therapist_id: string;
  patient_id: string;
  status: "pending" | "in_progress" | "completed" | "abandoned";
  shareable_token_hash?: string; // hash, nunca o token cru
  expires_at: string; // ISO timestamp
  created_at: string;
  completed_at?: string;
}

export interface GameResult<TData = unknown> {
  session_id: string;
  data: TData; // payload específico do jogo (criptografar via encryptPHI se PHI)
  summary: string; // pré-interpretação pro terapeuta (1-2 linhas)
  metrics: Record<string, number | string>; // ex: tempo total, num_clicks
  completed_at: string;
}

export interface GameEvent {
  session_id: string;
  event_type: string; // ex: "step_completed", "answer_chosen"
  payload: Record<string, unknown>;
  occurred_at: string;
}

/**
 * Contrato que cada jogo individual implementa.
 * Ficará em /features/games/{nome-jogo}/index.ts a partir da S3.
 */
export interface GameDefinition<TData = unknown> {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  // Lazy import obrigatório pra manter bundle leve
  component: () => Promise<{ default: React.ComponentType<GamePlayerProps<TData>> }>;
  summarize: (data: TData) => string;
  hasPHI: boolean; // se true, dados são criptografados via encryptPHI
}

export interface GamePlayerProps<TData = unknown> {
  session: GameSession;
  onProgress: (event: Omit<GameEvent, "session_id" | "occurred_at">) => void;
  onComplete: (result: Omit<GameResult<TData>, "session_id" | "completed_at">) => void;
}
