import type { SignedAgentClaims } from "./types";

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Verify every Cloudflare agent connection AND every model turn, not just the initial socket. */
export async function verifyAgentToken(
  value: unknown,
  secret: string,
  now = Date.now()
): Promise<SignedAgentClaims | null> {
  if (typeof value !== "string" || value.length > 2048 || !secret || new TextEncoder().encode(secret).length < 32) {
    return null;
  }
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const signatureBytes = decodeBase64Url(signature);
  const payloadBytes = decodeBase64Url(payload);
  if (!signatureBytes || !payloadBytes || signatureBytes.length !== 32) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(signatureBytes),
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;
    const unknownClaims: unknown = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!unknownClaims || typeof unknownClaims !== "object" || Array.isArray(unknownClaims)) return null;
    const claims = unknownClaims as Partial<SignedAgentClaims>;
    const nowSeconds = Math.floor(now / 1000);
    if (
      claims.v !== 1 || claims.aud !== "ai-sdk-pro-agent" ||
      typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 256 ||
      typeof claims.tid !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(claims.tid) ||
      typeof claims.iat !== "number" || !Number.isInteger(claims.iat) ||
      typeof claims.exp !== "number" || !Number.isInteger(claims.exp) ||
      claims.exp <= nowSeconds || claims.iat > nowSeconds + 5 ||
      claims.exp - claims.iat !== 60 ||
      typeof claims.jti !== "string" || !/^[0-9a-f-]{36}$/i.test(claims.jti)
    ) return null;
    return claims as SignedAgentClaims;
  } catch {
    return null;
  }
}

export function tokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return new URL(request.url).searchParams.get("token");
}
