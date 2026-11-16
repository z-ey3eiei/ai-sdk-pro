import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { issuePlatformToken, tokenDatabase } from "@/lib/platform-tokens";
import { checkPlatformRateLimit, isTrustedMutationOrigin, jsonError, noStoreHeaders, safePlatformError } from "@/lib/platform-policy";

export const runtime = "nodejs";

function failure(error: unknown) {
  const { message, status } = safePlatformError(error);
  return jsonError(message, status);
}

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser(request);
    const tokens = await tokenDatabase()`
      SELECT id, label, prefix, scope, created_at, expires_at FROM aisdk_pro.platform_token
      WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100
    `;
    return Response.json({ tokens }, { headers: noStoreHeaders() });
  } catch (error) {
    return failure(error);
  }
}

const tokenInput = z.object({ label: z.string().trim().min(1).max(64) }).strict();

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return jsonError("Origin is not allowed.", 403);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, "token-create")) return jsonError("Too many requests.", 429);
    const input = tokenInput.safeParse(await request.json().catch(() => null));
    if (!input.success) return jsonError("Enter a label between 1 and 64 characters.", 400);
    return Response.json(await issuePlatformToken(user.id, input.data.label), {
      status: 201,
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationOrigin(request)) return jsonError("Origin is not allowed.", 403);
  try {
    const user = await requireSessionUser(request);
    const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
    if (!id.success) return jsonError("Invalid token ID.", 400);
    await tokenDatabase()`DELETE FROM aisdk_pro.platform_token WHERE id = ${id.data} AND user_id = ${user.id}`;
    return new Response(null, { status: 204, headers: noStoreHeaders() });
  } catch (error) {
    return failure(error);
  }
}
