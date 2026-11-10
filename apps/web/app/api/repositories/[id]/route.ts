import { requireSessionUser } from "@/lib/auth";
import {
  getPlatformConfig,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import { getOwnedRepositoryDetail } from "@/lib/repository-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getPlatformConfig().configured) return jsonError("Platform setup is required.", 503);
  try {
    const user = await requireSessionUser(request);
    const { id } = await context.params;
    const detail = await getOwnedRepositoryDetail(user.id, id);
    if (!detail) return jsonError("Repository not found.", 404);
    return Response.json(detail, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
