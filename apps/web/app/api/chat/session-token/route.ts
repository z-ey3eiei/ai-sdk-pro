import { requireSessionUser } from "@/lib/auth";
import {
  isTrustedMutationOrigin,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import { issueAgentSessionToken, validAgentThreadId } from "@/lib/agent-session-token";
import { readLimitedBody } from "@/lib/request-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) {
    return jsonError("Untrusted request origin.", 403);
  }

  const secret = process.env.AGENT_AUTH_SECRET ?? "";
  if (Buffer.byteLength(secret, "utf8") < 32 || !process.env.NEXT_PUBLIC_CF_AGENT_URL) {
    return jsonError("Keyless chat is not configured.", 503);
  }

  try {
    const user = await requireSessionUser(request);
    const body = JSON.parse(
      await readLimitedBody(request, AbortSignal.timeout(5000), 2048)
    ) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("Invalid request body.", 400);
    }
    const threadId = (body as { threadId?: unknown }).threadId;
    if (!validAgentThreadId(threadId)) {
      return jsonError("Invalid thread identifier.", 400);
    }
    const { token, expiresAt } = issueAgentSessionToken(user.id, threadId, secret);
    const headers = noStoreHeaders();
    headers.set("Pragma", "no-cache");
    headers.set("Referrer-Policy", "no-referrer");
    return Response.json(
      { token, userId: user.id, threadId, expiresAt },
      { headers }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body.", 400);
    const outcome = safePlatformError(error);
    return jsonError(outcome.message, outcome.status);
  }
}
