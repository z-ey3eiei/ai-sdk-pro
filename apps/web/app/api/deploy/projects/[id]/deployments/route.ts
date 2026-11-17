import {
  authenticatedDeployContext, authorizedRepositoryForDeployment, controlPlane,
  DeploymentBridgeError, newDeploymentIdempotencyKey, type DeploymentEntry,
  type ProjectList,
} from "@/lib/deploy-bridge";
import { checkPlatformRateLimit, isTrustedMutationOrigin, jsonError,
  noStoreHeaders, safePlatformError } from "@/lib/platform-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{id: string}> };

function fail(error: unknown) {
  if (error instanceof DeploymentBridgeError) return jsonError(error.message, error.status);
  const safe = safePlatformError(error);
  return jsonError(safe.message, safe.status);
}

async function ownedProject(request: Request, id: string) {
  const context = await authenticatedDeployContext(request);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DeploymentBridgeError("Invalid project.", 400);
  const result = await controlPlane<ProjectList>(context.actor, "list");
  const project = result.projects.find(item => item.id === id);
  if (!project) throw new DeploymentBridgeError("Project not found.", 404);
  return { ...context, project, routingReady: result.routingReady };
}

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const { actor, project } = await ownedProject(request, id);
    if (!checkPlatformRateLimit(String(actor.githubId), "read"))
      return jsonError("Too many requests.", 429);
    const history = await controlPlane<{deployments:DeploymentEntry[]}>(actor, "history",
      { projectId: project.id });
    return Response.json(history, { headers: noStoreHeaders() });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) return jsonError("Invalid request origin.", 403);
  try {
    const { id } = await context.params;
    const { actor, token, project, routingReady } = await ownedProject(request, id);
    if (!routingReady) return jsonError("Deployment routing is not configured.", 503);
    if (!checkPlatformRateLimit(String(actor.githubId), "import"))
      return jsonError("Too many requests.", 429);
    await authorizedRepositoryForDeployment(token, project.repo_full_name);
    const result = await controlPlane<{queued:boolean;deploymentId:string|null}>(actor, "deploy",
      { projectId: project.id, deliveryId: newDeploymentIdempotencyKey() });
    return Response.json(result, { status: result.queued ? 202 : 200, headers: noStoreHeaders() });
  } catch (error) { return fail(error); }
}
