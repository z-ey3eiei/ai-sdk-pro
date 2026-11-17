export interface Env {
  AI: Ai;
  CHAT_AGENT: DurableObjectNamespace;
  BUDGET: DurableObjectNamespace;
  AGENT_AUTH_SECRET: string;
  /** Explicit on/off gate; omitted or invalid values disable inference. */
  KEYLESS_ENABLED?: string;
  ALLOWED_ORIGINS: string;
}

export interface SignedAgentClaims {
  v: 1;
  aud: "ai-sdk-pro-agent";
  sub: string;
  tid: string;
  iat: number;
  exp: number;
  jti: string;
}

export const MAX_DAILY_QUESTIONS = 30;
export const MAX_MONTHLY_BUDGET_MICROS = 5_000_000;
export const INPUT_RATE_MICROS_PER_MILLION = 60_500;
export const OUTPUT_RATE_MICROS_PER_MILLION = 400_000;
