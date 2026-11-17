
import { describe, expect, it } from "vitest";
import {
  acceptableBlobSignature, blobUserPrefix, MAX_USER_BLOB_BYTES,
  ownedBlobPath, privateBlobUploadPath,
} from "./blob-policy";
const owner = "a12fbd8e-3c29-4127-a03f-b7778902e201";
describe("private Blob upload security", () => {
  it("isolates the caller namespace and rejects traversal", () => {
    const path = privateBlobUploadPath(owner, "../../picture.png");
    expect(path.startsWith(blobUserPrefix(owner))).toBe(true);
    expect(ownedBlobPath(owner, path)).toBe(true);
    expect(ownedBlobPath("otherUser01", path)).toBe(false);
    expect(ownedBlobPath(owner, blobUserPrefix(owner) + "../secret.png")).toBe(false);
    expect(ownedBlobPath(owner, blobUserPrefix(owner) + "a//file.png")).toBe(false);
  });
  it("accepts media signatures and blocks HTML masquerading as an image", () => {
    const html = new TextEncoder().encode("<html>attack</html>");
    expect(acceptableBlobSignature(html, "image/png")).toBe(false);
    expect(acceptableBlobSignature(html, "text/html")).toBe(false);
    expect(acceptableBlobSignature(Uint8Array.of(137,80,78,71,13,10,26,10,1), "image/png")).toBe(true);
    expect(acceptableBlobSignature(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(MAX_USER_BLOB_BYTES).toBe(4194304);
  });
});
