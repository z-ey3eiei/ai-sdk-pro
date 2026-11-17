import { randomUUID } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
import { requireSessionUser } from "@/lib/auth";
import { privateBlobStorageEnabled } from "@/lib/feature-flags";
import {
  MAX_PRIVATE_BLOB_BYTES,
  PRIVATE_BLOB_CONTENT_TYPES,
  ownsBlobPath,
  userBlobPrefix,
  validatePrivateBlobUpload,
} from "@/lib/private-blob-policy";
import {
  checkPlatformRateLimit, isTrustedMutationOrigin, jsonError,
  noStoreHeaders, safePlatformError,
} from "@/lib/platform-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOWNLOAD_MIME = new Set(["image/jpeg","image/png","image/webp","application/pdf"]);

async function requirePrivateStore() {
  if (!await privateBlobStorageEnabled()) return null;
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || null;
}

function failure(error: unknown): Response {
  const safe = safePlatformError(error);
  return jsonError(safe.message, safe.status);
}

/** A private, owner-scoped listing or authenticated streaming download. */
export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireSessionUser(request);
    const token = await requirePrivateStore();
    if (!token) return jsonError("Private Blob storage is not configured.", 503);
    if (!checkPlatformRateLimit(user.id,"read")) return jsonError("Too many requests.",429);
    const pathname = new URL(request.url).searchParams.get("pathname");
    if (!pathname) {
      const objects = await list({ prefix: userBlobPrefix(user.id), limit: 50, token });
      return Response.json({
        enabled: true,
        files: objects.blobs.filter(item => ownsBlobPath(user.id,item.pathname)).map(item => ({
          pathname: item.pathname,
          size: item.size,
          uploadedAt: item.uploadedAt,
          contentType: item.pathname.endsWith(".pdf") ? "application/pdf" :
            item.pathname.endsWith(".jpg") ? "image/jpeg" :
            item.pathname.endsWith(".webp") ? "image/webp" : "image/png",
        })),
        hasMore: objects.hasMore,
      }, {headers:noStoreHeaders()});
    }
    if (!ownsBlobPath(user.id,pathname)) return jsonError("File not found.",404);
    const file = await get(pathname,{access:"private",token});
    if (!file || file.statusCode !== 200 || !file.stream) return jsonError("File not found.",404);
    const headers = noStoreHeaders();
    headers.set("Content-Type", DOWNLOAD_MIME.has(file.blob.contentType ?? "") ? file.blob.contentType! : "application/octet-stream");
    headers.set("Content-Disposition","attachment; filename=\"workspace-file\"");
    headers.set("X-Frame-Options","DENY");
    return new Response(file.stream,{status:200,headers});
  } catch(error) {
    return failure(error);
  }
}

/** Small private file uploads only; the browser never receives the store token. */
export async function POST(request: Request): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) return jsonError("Invalid request origin.",403);
  try {
    const user = await requireSessionUser(request);
    const token = await requirePrivateStore();
    if (!token) return jsonError("Private Blob storage is not configured.",503);
    if (!checkPlatformRateLimit(user.id,"import")) return jsonError("Upload rate limit reached.",429);
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data;")) return jsonError("Expected a file upload.",415);
    const length = Number(request.headers.get("content-length"));
    if (!Number.isFinite(length) || length < 1 || length > MAX_PRIVATE_BLOB_BYTES + 12_000)
      return jsonError("Upload is too large or missing its size.",413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("A file is required.",400);
    let mime: keyof typeof PRIVATE_BLOB_CONTENT_TYPES;
    try {
      mime = validatePrivateBlobUpload(file);
    } catch(error) {
      return jsonError(error instanceof Error ? error.message : "Invalid file.",400);
    }
    const name = userBlobPrefix(user.id) + randomUUID() + "." + PRIVATE_BLOB_CONTENT_TYPES[mime];
    const object = await put(name,file,{
      token,
      access:"private",
      addRandomSuffix:false,
      contentType:mime,
    });
    return Response.json({
      pathname:object.pathname,
      size:file.size,
      contentType:mime,
    },{status:201,headers:noStoreHeaders()});
  } catch(error) {
    return failure(error);
  }
}

/** Users may only remove files under their authenticated namespace. */
export async function DELETE(request: Request): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) return jsonError("Invalid request origin.",403);
  try {
    const user = await requireSessionUser(request);
    const token = await requirePrivateStore();
    if (!token) return jsonError("Private Blob storage is not configured.",503);
    if (!checkPlatformRateLimit(user.id,"import")) return jsonError("Too many requests.",429);
    const body = await request.text();
    if (body.length > 512) return jsonError("Invalid file selection.",400);
    let pathname: unknown;
    try { pathname = (JSON.parse(body) as {pathname?:unknown}).pathname; }
    catch { return jsonError("Invalid JSON.",400); }
    if (typeof pathname !== "string" || !ownsBlobPath(user.id,pathname))
      return jsonError("File not found.",404);
    await del(pathname,{token});
    return Response.json({removed:true},{headers:noStoreHeaders()});
  } catch(error) {
    return failure(error);
  }
}
