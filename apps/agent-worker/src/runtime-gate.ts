import type { Env } from "./types";

/**
 * A deployed Worker is NOT proof that paid inference may run.
 * Keep all routes except /health and CORS preflight closed until
 * the operator explicitly opts in and provisions a strong shared secret.
 */
export function keylessRuntimeEnabled(
  env: Pick<Env, "KEYLESS_ENABLED" | "AGENT_AUTH_SECRET">
): boolean {
  return env.KEYLESS_ENABLED === "true" &&
    typeof env.AGENT_AUTH_SECRET === "string" &&
    new TextEncoder().encode(env.AGENT_AUTH_SECRET).length >= 32;
}
