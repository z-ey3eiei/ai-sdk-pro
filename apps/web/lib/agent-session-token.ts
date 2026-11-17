import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const AGENT_TOKEN_TTL_SECONDS = 60;
export const AGENT_TOKEN_AUDIENCE = "ai-sdk-pro-agent";

export interface AgentSessionClaims {
  v: 1;
  aud: typeof AGENT_TOKEN_AUDIENCE;
  sub: string;
  tid: string;
  iat: number;
  exp: number;
  jti: string;
}

export function validAgentThreadId(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 64 &&
    /^[A-Za-z0-9_-]+$/.test(value);
}

function requireSigningSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("AGENT_AUTH_SECRET must be at least 32 UTF-8 bytes.");
  }
}

/** Opaque short-lived, tamper-evident token. Never put BYOK credentials in claims. */
export function issueAgentSessionToken(
  userId: string,
  threadId: string,
  secret: string,
  now = Date.now()
): { token: string; expiresAt: string } {
  requireSigningSecret(secret);
  if (!userId || userId.length > 256 || !validAgentThreadId(threadId)) {
    throw new Error("Invalid chat session identity.");
  }
  const iat = Math.floor(now / 1000);
  const claims: AgentSessionClaims = {
    v: 1,
    aud: AGENT_TOKEN_AUDIENCE,
    sub: userId,
    tid: threadId,
    iat,
    exp: iat + AGENT_TOKEN_TTL_SECONDS,
    jti: randomUUID(),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

/** Local test/diagnostic verifier. Worker uses Web Crypto with matching HMAC-SHA256. */
export function verifyAgentSessionToken(
  token: string,
  secret: string,
  now = Date.now()
): AgentSessionClaims | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  requireSigningSecret(secret);
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [payload, encodedSignature] = parts;
  const signature = Buffer.from(encodedSignature, "base64url");
  const expected = createHmac("sha256", secret).update(payload).digest();
  if (signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)) return null;
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const claims = value as Partial<AgentSessionClaims>;
  const nowSeconds = Math.floor(now / 1000);
  if (
    claims.v !== 1 ||
    claims.aud !== AGENT_TOKEN_AUDIENCE ||
    typeof claims.sub !== "string" ||
    !claims.sub || claims.sub.length > 256 ||
    !validAgentThreadId(claims.tid) ||
    typeof claims.iat !== "number" ||
    !Number.isInteger(claims.iat) ||
    typeof claims.exp !== "number" ||
    !Number.isInteger(claims.exp) ||
    typeof claims.jti !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(claims.jti) ||
    claims.iat > nowSeconds + 5 ||
    claims.exp <= nowSeconds ||
    claims.exp - claims.iat !== AGENT_TOKEN_TTL_SECONDS
  ) return null;
  return claims as AgentSessionClaims;
}
