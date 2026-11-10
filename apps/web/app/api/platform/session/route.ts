import { getAuth } from "@/lib/auth";
import {
  getPlatformConfig,
  isTrustedMutationOrigin,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import type { PlatformSession } from "@/lib/platform-types";
import { sanitizedSessionResponse } from "@/lib/session-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionResponse(
  request: Request,
  renew: boolean
): Promise<Response> {
  if (renew && !isTrustedMutationOrigin(request)) {
    return jsonError("Origin is not allowed.", 403);
  }
  if (!getPlatformConfig().configured) {
    return Response.json(
      { user: null, expiresAt: null } satisfies PlatformSession,
      { headers: noStoreHeaders() }
    );
  }
  try {
    const response = await getAuth().api.getSession({
      headers: request.headers,
      query: { disableRefresh: !renew },
      asResponse: true,
    });
    return await sanitizedSessionResponse(response);
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}

export const GET = (request: Request) => sessionResponse(request, false);
export const POST = (request: Request) => sessionResponse(request, true);
