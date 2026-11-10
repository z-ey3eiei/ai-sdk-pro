import { requireSessionUser } from "@/lib/auth";
import {
  getPlatformConfig,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import { getOwnedRepositoryFile } from "@/lib/repository-queries";
import { normalizeRepositoryPath } from "@/lib/repository-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getPlatformConfig().configured) return jsonError("Platform setup is required.", 503);
  try {
    const user = await requireSessionUser(request);
    const { id } = await context.params;
    const rawPath = new URL(request.url).searchParams.get("path");
    const path = rawPath ? normalizeRepositoryPath(rawPath) : null;
    if (!path) return jsonError("A valid repository file path is required.", 400);
    const file = await getOwnedRepositoryFile(user.id, id, path);
    if (!file) return jsonError("Repository file not found.", 404);
    return Response.json({ file }, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
