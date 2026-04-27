/**
 * Hook de ciclo de vida de uma sessão de jogo.
 * STUB Semana 1 — implementação real em S3.
 */
import type { GameSession, GameEvent, GameResult } from "./game.types";

export function useGameSession(_sessionId: string) {
  // TODO Semana 3: integrar com tabela game_sessions
  return {
    session: null as GameSession | null,
    isLoading: false,
    error: null as Error | null,
    recordEvent: async (_event: Omit<GameEvent, "session_id" | "occurred_at">) => {
      // TODO Semana 3: insert em game_events via server function
    },
    completeSession: async (_result: Omit<GameResult, "session_id" | "completed_at">) => {
      // TODO Semana 3: insert em game_results + update game_sessions.status
    },
  };
}
