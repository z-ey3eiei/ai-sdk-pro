import { describe, expect, it } from "vitest";
import {
  MAX_PRIVATE_BLOB_BYTES,
  ownsBlobPath,
  userBlobPrefix,
  validatePrivateBlobUpload,
} from "./private-blob-policy";

const owner = "abc12345-user";

describe("private Vercel Blob tenant boundaries", () => {
  it("scopes object keys under the authenticated user", () => {
    expect(userBlobPrefix(owner)).toBe("workspace/abc12345-user/");
    expect(() => userBlobPrefix("../escape")).toThrow();
  });
  it("rejects sibling users, traversals, and malicious keys", () => {
    const allowed = "workspace/abc12345-user/12345678-1234-1234-1234-123456789abc.png";
    expect(ownsBlobPath(owner, allowed)).toBe(true);
    expect(ownsBlobPath(owner, "workspace/abc12345-user2/12345678-1234-1234-1234-123456789abc.png")).toBe(false);
    expect(ownsBlobPath(owner, "workspace/abc12345-user/../other.png")).toBe(false);
    expect(ownsBlobPath(owner, "https://example.com/private.txt")).toBe(false);
    expect(ownsBlobPath(owner, "workspace/abc12345-user/a.svg")).toBe(false);
  });
  it("limits the size and MIME of uploads", () => {
    expect(validatePrivateBlobUpload({size: MAX_PRIVATE_BLOB_BYTES, type:"image/png"})).toBe("image/png");
    expect(() => validatePrivateBlobUpload({size: MAX_PRIVATE_BLOB_BYTES + 1, type:"image/png"})).toThrow();
    expect(() => validatePrivateBlobUpload({size: 10, type:"image/svg+xml"})).toThrow();
    expect(() => validatePrivateBlobUpload({size: 0, type:"application/pdf"})).toThrow();
  });
});
