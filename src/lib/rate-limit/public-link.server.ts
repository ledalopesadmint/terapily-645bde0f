/**
 * Rate limit em memória do worker pra endpoints públicos do magic link.
 *
 * Constraint (magic-link-rules-locked):
 *  - 10 req/min por IP
 *  - 5 req/min por token (hash)
 *
 * SCOPE:
 *  - Por isolate/worker. Não é distribuído. Suficiente pra S3 já que abuso
 *    sustentado bloqueia esse worker e o atacante pagaria caro pra rodar
 *    distribuído contra um link single-use.
 *  - Em S5/S6, migrar pra Durable Object ou tabela rate_limit_buckets se
 *    abuso for detectado em audit.
 *
 *  - Mensagem ao cliente: NEUTRA. Mesmo throw do PublicLinkError pra não
 *    revelar se o token existe ou não.
 */

const WINDOW_MS = 60_000;
const IP_LIMIT = 10;
const TOKEN_LIMIT = 5;

type Bucket = { count: number; resetAt: number };

const ipBuckets = new Map<string, Bucket>();
const tokenBuckets = new Map<string, Bucket>();

function tick(map: Map<string, Bucket>, key: string, limit: number): boolean {
  const now = Date.now();
  const b = map.get(key);
  if (!b || b.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

// Periodicamente limpa entradas expiradas pra não vazar memória.
function gc(map: Map<string, Bucket>) {
  if (map.size < 1024) return;
  const now = Date.now();
  for (const [k, v] of map) if (v.resetAt <= now) map.delete(k);
}

export class PublicLinkRateLimitError extends Error {
  constructor() {
    super("Este link não está disponível. Peça um novo link ao seu terapeuta.");
    this.name = "PublicLinkRateLimitError";
  }
}

export interface RateLimitInput {
  ip: string;
  tokenHash: string;
  bucket: string; // só pra log/diagnóstico, não afeta limite
}

export async function checkPublicLinkRateLimit(
  input: RateLimitInput,
): Promise<void> {
  gc(ipBuckets);
  gc(tokenBuckets);

  const ipKey = `${input.ip}`;
  const tokKey = `${input.tokenHash}`;

  const ipOk = tick(ipBuckets, ipKey, IP_LIMIT);
  const tokOk = tick(tokenBuckets, tokKey, TOKEN_LIMIT);

  if (!ipOk || !tokOk) {
    console.warn("[public-link] rate_limited", {
      bucket: input.bucket,
      reason: !ipOk ? "ip" : "token",
    });
    throw new PublicLinkRateLimitError();
  }
}
