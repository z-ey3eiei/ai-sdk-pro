import { describe, expect, it } from "vitest";

import {
  decodeTextBlob,
  isSkippableRepositoryPath,
  normalizeRepositoryPath,
  selectSnapshotCandidates,
} from "./repository-snapshot";

describe("repository snapshot safety", () => {
  it("rejects traversal and unsafe paths", () => {
    expect(normalizeRepositoryPath("../secret.txt")).toBeNull();
    expect(normalizeRepositoryPath("src\\secret.txt")).toBeNull();
    expect(isSkippableRepositoryPath(".env.production")).toBe(true);
    expect(isSkippableRepositoryPath("config/private_key.pem")).toBe(true);
    expect(isSkippableRepositoryPath("node_modules/pkg/index.js")).toBe(true);
    expect(isSkippableRepositoryPath("image.png")).toBe(true);
    expect(isSkippableRepositoryPath("src/index.ts")).toBe(false);
  });

  it("omits common SSH private key filenames while keeping source files importable", () => {
    expect(isSkippableRepositoryPath(".ssh/id_rsa")).toBe(true);
    expect(isSkippableRepositoryPath(".ssh/id_ecdsa")).toBe(true);
    expect(isSkippableRepositoryPath(".ssh/id_ed25519")).toBe(true);
    expect(isSkippableRepositoryPath("keys/deploy_key")).toBe(true);
    expect(isSkippableRepositoryPath("src/agent.ts")).toBe(false);

    const snapshot = selectSnapshotCandidates([
      { path: ".ssh/id_ed25519", sha: "private", size: 64 },
      { path: "keys/deploy_key", sha: "deploy", size: 64 },
      { path: "src/agent.ts", sha: "source", size: 18 },
    ]);
    expect(snapshot.selected.map(candidate => candidate.path)).toEqual([
      "src/agent.ts",
    ]);
    expect(snapshot.skippedFiles).toBe(2);
  });

  it("bounds files and per-file bytes before fetching blobs", () => {
    const result = selectSnapshotCandidates([
      { path: "src/ok.ts", sha: "1", size: 10 },
      { path: "src/too-large.ts", sha: "2", size: 65 * 1024 },
      ...Array.from({ length: 101 }, (_, i) => ({ path: `src/${i}.ts`, sha: String(i + 3), size: 10 })),
    ]);
    expect(result.selected.length).toBe(100);
    expect(result.skippedFiles).toBeGreaterThan(1);
    expect(result.snapshotTruncated).toBe(true);
  });

  it("only decodes valid, NUL-free UTF-8 text", () => {
    expect(decodeTextBlob(new TextEncoder().encode("hello"))).toBe("hello");
    expect(decodeTextBlob(Uint8Array.from([0, 1, 2]))).toBeNull();
    expect(decodeTextBlob(Uint8Array.from([0xff, 0xfe]))).toBeNull();
  });
});
