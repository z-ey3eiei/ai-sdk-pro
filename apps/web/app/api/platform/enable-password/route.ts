
import { and, eq } from "drizzle-orm";
import { getAuth, requireSessionUser } from "@/lib/auth";
import { getPlatformDb } from "@/lib/db/client";
import { account } from "@/lib/db/schema";
import {
  checkPlatformRateLimit, getPlatformConfig, isTrustedMutationOrigin,
  jsonError, noStoreHeaders, safePlatformError,
} from "@/lib/platform-policy";
import { readLimitedBody } from "@/lib/request-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Allows existing GitHub-first members to use native login under the SAME user ID. */
export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return jsonError("Invalid request origin.", 403);
  if (!getPlatformConfig().emailRegistrationAvailable)
    return jsonError("Email sign-in is not enabled.", 503);
  try {
    const user = await requireSessionUser(request);
    if (!user.emailVerified) return jsonError("Verify your email before adding a password.", 403);
    if (!checkPlatformRateLimit(user.id, "import"))
      return jsonError("Too many password setup requests.", 429);
    const db = getPlatformDb();
    if (!db) return jsonError("Account storage is unavailable.", 503);
    const rows = await db.select({providerId:account.providerId}).from(account)
      .where(eq(account.userId, user.id));
    if (rows.some(row => row.providerId === "credential"))
      return jsonError("Password login already exists for this user.", 409);
    if (!rows.some(row => row.providerId === "github"))
      return jsonError("Only existing GitHub accounts can add a password here.", 403);
    let body: { newPassword?: unknown };
    try {
      body = JSON.parse(await readLimitedBody(request,
        AbortSignal.any([request.signal, AbortSignal.timeout(5000)]), 2048));
    } catch { return jsonError("Invalid password request.", 400); }
    if (!body || typeof body.newPassword !== "string" ||
        body.newPassword.length < 12 || body.newPassword.length > 128)
      return jsonError("Password must be 12 to 128 characters.", 400);
    await getAuth().api.setPassword({
      headers: request.headers,
      body: { newPassword: body.newPassword },
    });
    return Response.json({ ok: true }, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
