import { getSessionUser, publicUser } from "@/lib/auth";
import {
  getPlatformConfig,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import type { PlatformSession } from "@/lib/platform-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!getPlatformConfig().configured) {
    return Response.json({ user: null } satisfies PlatformSession, {
      headers: noStoreHeaders(),
    });
  }
  try {
    const user = await getSessionUser(request);
    const response: PlatformSession = { user: user ? publicUser(user) : null };
    return Response.json(response, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
