import { z } from "zod";
import { getGitHubAccessToken, requireSessionUser } from "@/lib/auth";
import { githubApiPath, githubRequest, GITHUB_API_ORIGIN } from "@/lib/github/client";
import { checkPlatformRateLimit, isTrustedMutationOrigin, jsonError, noStoreHeaders, safePlatformError } from "@/lib/platform-policy";
import { getOwnedRepository } from "@/lib/repository-queries";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

// This project is provisioned in the Cloudflare D1 deployment registry.
const project = {
  id: "1458143895",
  owner: "z-ey3eiei",
  repository: "urban-couscous",
  branch: "main",
  workflow: "aisdk-deploy.yml",
  origin: "https://urban-couscous.ai-sdk.pro",
};
const fullName = `${project.owner}/${project.repository}`;
const workflowUrl = `https://github.com/${fullName}/actions/workflows/${project.workflow}`;
const commitSchema = z.object({ commit: z.string().regex(/^[a-f0-9]{40}$/).nullable() });

async function handle(request: Request, context: Context, deploy: boolean) {
  if (deploy && !isTrustedMutationOrigin(request)) return jsonError("Origin is not allowed.", 403);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, deploy ? "import" : "read")) return jsonError("Too many requests.", 429);
    const { id } = await context.params;
    const repository = await getOwnedRepository(user.id, id);
    if (!repository) return jsonError("Repository not found.", 404);
    if (repository.private || String(repository.githubId) !== project.id || repository.fullName.toLowerCase() !== fullName || repository.defaultBranch !== project.branch)
      return deploy ? jsonError("Repository is not registered for deployment.", 404) : Response.json({ deployment: null }, { headers: noStoreHeaders() });
    if (!deploy) {
      const result = await fetch(new URL("/_aisdk/status", project.origin), {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (!result.ok) return jsonError("Deployment status unavailable.", 502);
      const { commit } = commitSchema.parse(await result.json());
      return Response.json({ deployment: { commit, branch: project.branch, url: project.origin, workflowUrl } }, { headers: noStoreHeaders() });
    }
    const token = await getGitHubAccessToken(request, user.id);
    const path = githubApiPath("repos", project.owner, project.repository);
    const source = await githubRequest<{ id: number; permissions?: { push?: boolean } }>(path, token);
    if (String(source.id) !== project.id || !source.permissions?.push) return jsonError("GitHub write access to the repository is required.", 403);
    const dispatchPath = githubApiPath("repos", project.owner, project.repository, "actions", "workflows", project.workflow, "dispatches");
    const response = await fetch(new URL(dispatchPath, GITHUB_API_ORIGIN), {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: project.branch }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if ([401, 403, 404].includes(response.status))
      return jsonError("GitHub did not authorize deployment. Run the workflow on GitHub or grant the GitHub App Actions write access.", 403);
    if (![200, 204].includes(response.status)) return jsonError("GitHub could not start the workflow.", 502);
    return Response.json({ workflowUrl }, { status: 202, headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}

export const GET = (request: Request, context: Context) => handle(request, context, false);
export const POST = (request: Request, context: Context) => handle(request, context, true);
