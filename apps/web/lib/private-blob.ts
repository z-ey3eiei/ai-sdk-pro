
import "server-only";
import { get, list, put } from "@vercel/blob";
import {
  acceptableBlobSignature, blobUserPrefix, MAX_USER_BLOB_BYTES,
  ownedBlobPath, privateBlobUploadPath,
} from "./blob-policy";

function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || token.trim().length < 30)
    throw new Error("Private Vercel Blob store is not configured.");
  return token;
}
export function privateBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim() &&
    process.env.BLOB_READ_WRITE_TOKEN.trim().length >= 30);
}
export async function listPrivateBlobs(userId: string) {
  const result = await list({ prefix: blobUserPrefix(userId), limit: 50, token: blobToken() });
  return {
    files: result.blobs.filter(file => ownedBlobPath(userId, file.pathname))
      .map(file => ({
        pathname: file.pathname, name: file.pathname.split("/").pop() || "file",
        size: file.size, uploadedAt: file.uploadedAt,
      })),
    hasMore: result.hasMore,
  };
}
export async function uploadPrivateBlob(
  userId: string, filename: string, mime: string, data: Uint8Array
) {
  if (!data.byteLength || data.byteLength > MAX_USER_BLOB_BYTES ||
      !acceptableBlobSignature(data, mime))
    throw new Error("The file format or size is not allowed.");
  const result = await put(
    privateBlobUploadPath(userId, filename),
    new Blob([Uint8Array.from(data)], { type: mime }),
    { access: "private", contentType: mime, addRandomSuffix: true,
      allowOverwrite: false, token: blobToken() }
  );
  if (!ownedBlobPath(userId, result.pathname))
    throw new Error("The storage response is invalid.");
  return { pathname: result.pathname, name: result.pathname.split("/").pop(), size: data.byteLength };
}
export async function downloadPrivateBlob(userId: string, pathname: string) {
  if (!ownedBlobPath(userId, pathname)) return null;
  return get(pathname, { access: "private", token: blobToken() });
}
