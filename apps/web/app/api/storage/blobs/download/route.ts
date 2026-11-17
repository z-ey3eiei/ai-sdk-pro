
import { requireSessionUser } from "@/lib/auth";
import { privateBlobUploads } from "@/flags";
import { ownedBlobPath } from "@/lib/blob-policy";
import { downloadPrivateBlob, privateBlobConfigured } from "@/lib/private-blob";
import {
  checkPlatformRateLimit, getPlatformConfig, jsonError,
  noStoreHeaders, safePlatformError,
} from "@/lib/platform-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!getPlatformConfig().configured) return jsonError("Platform setup required.", 503);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, "blob-download"))
      return jsonError("Too many requests.", 429);
    if (!(await privateBlobUploads()) || !privateBlobConfigured())
      return jsonError("Private Blob storage is not enabled.", 503);
    const pathname = new URL(request.url).searchParams.get("pathname") || "";
    if (!ownedBlobPath(user.id, pathname)) return jsonError("File not found.", 404);
    const result = await downloadPrivateBlob(user.id, pathname);
    if (!result || result.statusCode !== 200 || !result.stream)
      return jsonError("File not found.", 404);
    const filename = (pathname.split("/").pop() || "download").replace(/[^A-Za-z0-9_.-]/g, "_");
    const headers = noStoreHeaders();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", 'attachment; filename="' + filename + '"');
    headers.set("X-Frame-Options", "DENY");
    headers.set("Content-Security-Policy", "sandbox");
    return new Response(result.stream, { status: 200, headers });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
