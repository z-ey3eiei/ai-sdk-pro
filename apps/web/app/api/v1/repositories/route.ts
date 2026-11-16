import { repositoryReader } from "@/lib/platform-tokens";
import { listOwnedRepositories } from "@/lib/repository-queries";
import { checkPlatformRateLimit, jsonError, noStoreHeaders, safePlatformError } from "@/lib/platform-policy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const owner = await repositoryReader(request);
    if (!owner) return jsonError("A valid API token is required.", 401);
    if (!checkPlatformRateLimit(owner, "token-repository-read")) return jsonError("Too many requests.", 429);

    const repositories = (await listOwnedRepositories(owner)).map(repository => ({
      id: repository.id,
      fullName: repository.fullName,
      defaultBranch: repository.defaultBranch,
      private: repository.private,
    }));
    return Response.json({ repositories }, { headers: noStoreHeaders() });
  } catch (error) {
    const { message, status } = safePlatformError(error);
    return jsonError(message, status);
  }
}
