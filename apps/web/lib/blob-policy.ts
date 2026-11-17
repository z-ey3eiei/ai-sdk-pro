
import { randomUUID } from "node:crypto";

export const MAX_USER_BLOB_BYTES = 4 * 1024 * 1024;
export const ALLOWED_BLOB_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "application/pdf",
]);

export function blobUserPrefix(userId: string): string {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(userId))
    throw new Error("Invalid user namespace.");
  return "users/" + userId + "/uploads/";
}

export function ownedBlobPath(userId: string, pathname: string): boolean {
  const prefix = blobUserPrefix(userId);
  return typeof pathname === "string" && pathname.startsWith(prefix) &&
    pathname.length < 512 && pathname.length > prefix.length &&
    !pathname.includes("\\") &&
    !pathname.split("/").some(part => part === "." || part === ".." || part === "");
}

export function privateBlobUploadPath(userId: string, filename: string): string {
  const base = filename.trim().split(/[\\/]/).pop() || "";
  const safe = base.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/^\.+/, "").slice(0, 100);
  if (!safe || safe === "." || safe === "..") throw new Error("Invalid filename.");
  return blobUserPrefix(userId) + randomUUID() + "/" + safe;
}

export function acceptableBlobSignature(data: Uint8Array, mime: string): boolean {
  if (!ALLOWED_BLOB_TYPES.has(mime)) return false;
  if (mime === "image/png") return data.length >= 8 &&
    [137,80,78,71,13,10,26,10].every((v,i) => data[i] === v);
  if (mime === "image/jpeg") return data.length >= 3 &&
    data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mime === "image/webp") return data.length >= 12 &&
    String.fromCharCode(...data.slice(0,4)) === "RIFF" &&
    String.fromCharCode(...data.slice(8,12)) === "WEBP";
  if (mime === "application/pdf") return data.length >= 5 &&
    String.fromCharCode(...data.slice(0,5)) === "%PDF-";
  return false;
}
