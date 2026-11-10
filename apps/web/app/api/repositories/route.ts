import { z } from "zod";

import { getGitHubAccessToken, requireSessionUser } from "@/lib/auth";
import { buildRepositorySnapshot } from "@/lib/github/repositories";
import {
  checkPlatformRateLimit,
  getPlatformConfig,
  isTrustedMutationOrigin,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import { persistRepositorySnapshot } from "@/lib/repository-persistence";
import { getOwnedRepository, listOwnedRepositories } from "@/lib/repository-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({
  fullName: z.string().trim().min(3).max(200).regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  installationId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}).strict();

async function bodyWithinLimit(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 8_192) throw new Error("Request body is too large.");
  if (!request.body) throw new Error("Request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 8_192) throw new Error("Request body is too large.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function GET(request: Request) {
  if (!getPlatformConfig().configured) return jsonError("Platform setup is required.", 503);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id)) return jsonError("Too many requests. Try again shortly.", 429);
    return Response.json({ repositories: await listOwnedRepositories(user.id) }, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}

export async function POST(request: Request) {
  if (!getPlatformConfig().configured) return jsonError("Platform setup is required.", 503);
  if (!isTrustedMutationOrigin(request)) return jsonError("Origin is not allowed.", 403);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, "import")) return jsonError("Too many imports. Try again later.", 429);
    let input: z.infer<typeof importSchema>;
    try {
      input = importSchema.parse(await bodyWithinLimit(request));
    } catch {
      return jsonError("Expected a repository fullName and installationId.", 400);
    }
    const token = await getGitHubAccessToken(request, user.id);
    const snapshot = await buildRepositorySnapshot(token, input);
    const repositoryId = await persistRepositorySnapshot(user.id, snapshot);
    const repository = await getOwnedRepository(user.id, repositoryId);
    if (!repository) return jsonError("The imported repository was not found.", 500);
    return Response.json({ repository }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
