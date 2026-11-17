/**
 * Vercel Blob is for private, user-owned Workspace files.
 * Cloudflare R2 remains the source of truth for build artifacts and logs.
 */
export const MAX_PRIVATE_BLOB_BYTES = 4_000_000;
export const PRIVATE_BLOB_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;

export function userBlobPrefix(userId: string): string {
  if (!/^[a-zA-Z0-9_-]{8,96}$/.test(userId)) {
    throw new Error("Invalid user identifier.");
  }
  return `workspace/${userId}/`;
}

export function ownsBlobPath(userId: string, pathname: string): boolean {
  if (typeof pathname !== "string" || pathname.length > 240) return false;
  return new RegExp(
    "^" + userBlobPrefix(userId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    "[a-f0-9]{8}-[a-f0-9-]{27,32}\\.(?:jpg|png|webp|pdf)$"
  ).test(pathname);
}

export function validatePrivateBlobUpload(
  file: {size: number; type: string}
): keyof typeof PRIVATE_BLOB_CONTENT_TYPES {
  if (file.size < 1 || file.size > MAX_PRIVATE_BLOB_BYTES) {
    throw new Error("File must be between 1 byte and 4 MB.");
  }
  if (!Object.prototype.hasOwnProperty.call(PRIVATE_BLOB_CONTENT_TYPES, file.type)) {
    throw new Error("Only JPEG, PNG, WebP and PDF files are allowed.");
  }
  return file.type as keyof typeof PRIVATE_BLOB_CONTENT_TYPES;
}
