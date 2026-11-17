import {
  authenticatedDeployContext, authorizedRepositoryForDeployment,
  controlPlane, DeploymentBridgeError, type ProjectList,
} from "@/lib/deploy-bridge";
import {
  checkPlatformRateLimit, isTrustedMutationOrigin, jsonError, noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import { readLimitedBody } from "@/lib/request-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(error: unknown) {
  if (error instanceof DeploymentBridgeError) return jsonError(error.message, error.status);
  const safe = safePlatformError(error);
  return jsonError(safe.message, safe.status);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { actor } = await authenticatedDeployContext(request);
    if (!checkPlatformRateLimit(String(actor.githubId), "read"))
      return jsonError("Too many requests.", 429);
    const result = await controlPlane<ProjectList>(actor, "list");
    return Response.json(result, { headers: noStoreHeaders() });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) return jsonError("Invalid request origin.", 403);
  try {
    const { actor, token } = await authenticatedDeployContext(request);
    if (!checkPlatformRateLimit(String(actor.githubId), "import"))
      return jsonError("Too many requests.", 429);
    const input = JSON.parse(await readLimitedBody(request, AbortSignal.timeout(5000), 2048)) as {
      name?: unknown; repository?: unknown; installationId?: unknown;
      framework?: unknown; outputDir?: unknown;
    };
    if (!input || typeof input !== "object" ||
        typeof input.name !== "string" || !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(input.name) ||
        typeof input.repository !== "string" ||
        !Number.isSafeInteger(input.installationId) || Number(input.installationId) < 1 ||
        !["auto", "static", "astro", "nextjs"].includes(String(input.framework ?? "auto")) ||
        (input.outputDir !== undefined && (typeof input.outputDir !== "string" ||
          !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(input.outputDir))))
      return jsonError("Invalid deployment project settings.", 400);

    const repo = await authorizedRepositoryForDeployment(
      token, input.repository, Number(input.installationId)
    );
    const project = await controlPlane<{id:string; hostname:string}>(actor, "import", {
      name: input.name, repository: repo.fullName,
      repoId: repo.id, installationId: repo.installationId,
      framework: input.framework ?? "auto", outputDir: input.outputDir || null,
    });
    return Response.json({ project }, { status: 201, headers: noStoreHeaders() });
  } catch (error) { return fail(error); }
}
