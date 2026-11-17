import { createHash } from "node:crypto";

export const MAX_PRIVATE_ARCHIVE_BYTES = 8 * 1024 * 1024;
export type PrivateObjectScope = "repository" | "thread";

export class PrivateR2PolicyError extends Error {
  readonly status = 403;
  constructor() {
    super("Private object access denied.");
    this.name = "PrivateR2PolicyError";
  }
}

export interface PrivateObjectResource {
  scope: PrivateObjectScope;
  resourceId: string;
  ownerUserId: string;
}

/**
 * This is a pure authorization/key-building boundary. The caller MUST derive
 * ownerUserId from the database after authenticating the session; never trust
 * an ownerUserId supplied by the browser.
 *
 * R2 operations remain disabled until an independently inventoried private
 * bucket binding and upload/download endpoints are configured.
 */
export function privateR2ObjectKey(
  verifiedUserId: string,
  resource: PrivateObjectResource,
  filename: string,
  sizeBytes: number
): string {
  if (
    !verifiedUserId || verifiedUserId !== resource.ownerUserId ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(resource.resourceId) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(filename) ||
    filename.includes("..") ||
    !Number.isSafeInteger(sizeBytes) || sizeBytes < 0 ||
    sizeBytes > MAX_PRIVATE_ARCHIVE_BYTES
  ) throw new PrivateR2PolicyError();

  const userPrefix = createHash("sha256").update(verifiedUserId).digest("hex");
  return `private/${userPrefix}/${resource.scope}/${resource.resourceId}/${filename}`;
}
