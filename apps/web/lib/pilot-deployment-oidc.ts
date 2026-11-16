import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";

const issuer = "https://token.actions.githubusercontent.com";
const audience = "https://staging.ai-sdk.pro/api/github/webhook";
const repository = "z-ey3eiei/urban-couscous";
const branch = "aisdk/preview-pilot";
const ref = "refs/heads/" + branch;
const claimsSchema = z.object({
  iss: z.literal(issuer), aud: z.literal(audience),
  sub: z.literal(`repo:${repository}:ref:${ref}`),
  repository: z.literal(repository), repository_id: z.literal("1458143895"),
  event_name: z.literal("push"), ref: z.literal(ref),
  workflow_ref: z.literal(`${repository}/.github/workflows/aisdk-preview.yml@${ref}`),
  sha: z.string().regex(/^[a-f0-9]{40}$/), workflow_sha: z.string(),
  exp: z.number().int(), iat: z.number().int(), nbf: z.number().int(),
});
const headerSchema = z.object({ alg: z.literal("RS256"), kid: z.string().max(128) });
const keySchema = z.object({ kty: z.literal("RSA"), kid: z.string(), n: z.string(), e: z.string() });
const keySet = z.object({ keys: z.array(keySchema).max(25) });

export async function readPilotDeploymentIdentity(header: string | null) {
  try {
    const parts = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(header ?? "")?.[1];
    if (!parts || parts.length > 10_000) return null;
    const [encodedHeader, encodedClaims, signature] = parts.split(".");
    const metadata = headerSchema.parse(JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")));
    const claims = claimsSchema.parse(JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")));
    const now = Math.floor(Date.now() / 1000);
    if (claims.workflow_sha !== claims.sha || claims.exp <= now || claims.iat > now + 30 ||
        claims.nbf > now + 30 || claims.exp - claims.iat > 600 || claims.iat < now - 600) return null;
    const response = await fetch(issuer + "/.well-known/jwks", {
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const key = keySet.parse(await response.json()).keys.find(item => item.kid === metadata.kid);
    if (!key || !verify("RSA-SHA256", Buffer.from(encodedHeader + "." + encodedClaims),
      createPublicKey({ key, format: "jwk" }), Buffer.from(signature, "base64url"))) return null;
    return { repositoryId: 1458143895, installationId: 182509960, branch, commit: claims.sha, pullRequest: null };
  } catch {
    return null;
  }
}
