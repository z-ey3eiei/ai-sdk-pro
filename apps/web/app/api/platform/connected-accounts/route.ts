
import { and, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth";
import { getPlatformDb } from "@/lib/db/client";
import { account } from "@/lib/db/schema";
import { noStoreHeaders, jsonError, safePlatformError } from "@/lib/platform-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser(request);
    const db = getPlatformDb();
    if (!db) return jsonError("Account storage is not available.", 503);
    const linked = await db.select({ providerId: account.providerId })
      .from(account).where(eq(account.userId, user.id));
    return Response.json({
      github: linked.some(row => row.providerId === "github"),
      password: linked.some(row => row.providerId === "credential"),
      emailVerified: user.emailVerified === true,
      email: user.email,
    }, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
