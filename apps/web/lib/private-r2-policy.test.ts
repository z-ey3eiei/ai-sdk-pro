import { describe, expect, it } from "vitest";
import {
  MAX_PRIVATE_ARCHIVE_BYTES,
  PrivateR2PolicyError,
  privateR2ObjectKey,
} from "./private-r2-policy";

describe("private R2 ownership boundary", () => {
  const ownedRepo = { scope: "repository" as const, resourceId: "repo-12", ownerUserId: "user-A" };
  const ownedThread = { scope: "thread" as const, resourceId: "thread-2", ownerUserId: "user-A" };

  it("derives isolated object keys for repository and thread data", () => {
    const repoKey = privateR2ObjectKey("user-A", ownedRepo, "archive.zip", 128);
    const threadKey = privateR2ObjectKey("user-A", ownedThread, "attachment.txt", 128);
    expect(repoKey).toContain("/repository/repo-12/");
    expect(threadKey).toContain("/thread/thread-2/");
    expect(repoKey).not.toBe(threadKey);
  });

  it("blocks cross-tenant repository and thread access", () => {
    expect(() => privateR2ObjectKey("user-B", ownedRepo, "archive.zip", 1))
      .toThrow(PrivateR2PolicyError);
    expect(() => privateR2ObjectKey("user-B", ownedThread, "attachment.txt", 1))
      .toThrow(PrivateR2PolicyError);
  });

  it("rejects traversals and unbounded archives", () => {
    for (const name of ["../secret", "path/to/file", "..archive", "", ".env"]) {
      expect(() => privateR2ObjectKey("user-A", ownedRepo, name, 1)).toThrow();
    }
    expect(() => privateR2ObjectKey("user-A", ownedRepo, "safe.zip", MAX_PRIVATE_ARCHIVE_BYTES + 1)).toThrow();
  });
});
