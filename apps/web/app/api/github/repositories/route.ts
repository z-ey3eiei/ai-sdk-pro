import { getGitHubAccessToken, requireSessionUser } from "@/lib/auth";
import { listAccessibleGitHubRepositories } from "@/lib/github/repositories";
import {
  checkPlatformRateLimit,
  getPlatformConfig,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import type { GitHubRepositoryList } from "@/lib/platform-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!getPlatformConfig().configured)
    return jsonError("Platform setup is required.", 503);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id))
      return jsonError("Too many requests. Try again shortly.", 429);
    const token = await getGitHubAccessToken(request, user.id);
    const repositories = await listAccessibleGitHubRepositories(
      token,
      request.signal
    );
    const result: GitHubRepositoryList = {
      repositories,
      capped: repositories.length >= 200,
      installUrl: getPlatformConfig().githubAppSlug
        ? `https://github.com/apps/${encodeURIComponent(getPlatformConfig().githubAppSlug)}/installations/new`
        : null,
    };
    return Response.json(result, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
