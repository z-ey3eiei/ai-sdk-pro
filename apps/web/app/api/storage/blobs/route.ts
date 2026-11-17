
import { requireSessionUser } from "@/lib/auth";
import { privateBlobUploads } from "@/flags";
import { MAX_USER_BLOB_BYTES, ALLOWED_BLOB_TYPES } from "@/lib/blob-policy";
import { privateBlobConfigured, listPrivateBlobs, uploadPrivateBlob } from "@/lib/private-blob";
import {
  checkPlatformRateLimit, getPlatformConfig, isTrustedMutationOrigin,
  jsonError, noStoreHeaders, safePlatformError,
} from "@/lib/platform-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function storageDisabled(): Promise<Response | null> {
  if (!(await privateBlobUploads()) || !privateBlobConfigured())
    return jsonError("Private Blob storage is not enabled for this workspace.", 503);
  return null;
}

export async function GET(request: Request): Promise<Response> {
  if (!getPlatformConfig().configured) return jsonError("Platform setup required.", 503);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, "blob-list")) return jsonError("Too many requests.", 429);
    const disabled = await storageDisabled();
    if (disabled) return disabled;
    return Response.json(await listPrivateBlobs(user.id), { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}

async function readBoundedFile(request: Request): Promise<Uint8Array | null> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_USER_BLOB_BYTES)) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_USER_BLOB_BYTES) return null;
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (size === 0) return null;
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.byteLength; }
  return result;
}

export async function POST(request: Request): Promise<Response> {
  if (!getPlatformConfig().configured) return jsonError("Platform setup required.", 503);
  if (!isTrustedMutationOrigin(request)) return jsonError("Invalid request origin.", 403);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, "import")) return jsonError("Too many uploads.", 429);
    const disabled = await storageDisabled();
    if (disabled) return disabled;
    const mime = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const filename = request.headers.get("x-file-name") || "";
    if (!ALLOWED_BLOB_TYPES.has(mime) || filename.length > 200 || !filename.trim())
      return jsonError("Only PNG, JPEG, WebP and PDF files are supported.", 415);
    const data = await readBoundedFile(request);
    if (!data) return jsonError("File exceeds the 4 MB limit or is empty.", 413);
    try {
      const file = await uploadPrivateBlob(user.id, filename, mime, data);
      return Response.json({ file }, { status: 201, headers: noStoreHeaders() });
    } catch {
      return jsonError("The upload could not be completed.", 502);
    }
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
