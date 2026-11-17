/**
 * Public deploy is gated behind the verified Better Auth server-to-server bridge.
 * Legacy standalone dashboard OAuth remains beta-only.
 */
export function allowUnifiedDeploy(env, githubId) {
  if (!Number.isSafeInteger(githubId) || githubId <= 0) return false;
  const beta = (env.BETA_GITHUB_IDS ?? '').split(',').map(v => v.trim()).includes(String(githubId));
  if (beta) return true;
  const secret = env.PLATFORM_BRIDGE_SECRET;
  return env.PUBLIC_DEPLOY_ENABLED === 'true' &&
    env.PLATFORM_BRIDGE_ENABLED === 'true' &&
    env.PROJECT_ROUTING_READY === 'true' &&
    typeof secret === 'string' &&
    new TextEncoder().encode(secret).length >= 32;
}
export const quotaForPlan = plan => plan === 'pro' ? 25 : 3;
