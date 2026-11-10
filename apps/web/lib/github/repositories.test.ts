import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  githubRequest: vi.fn(),
  githubApiPath: (...segments: string[]) =>
    `/${segments.map(encodeURIComponent).join("/")}`,
}));

import { githubRequest } from "./client";
import {
  buildRepositorySnapshot,
  listAccessibleGitHubRepositories,
} from "./repositories";

const request = vi.mocked(githubRequest);
const repository = {
  id: 1,
  name: "demo",
  full_name: "owner/demo",
  description: null,
  default_branch: "main",
  private: true,
  language: "TypeScript",
  stargazers_count: 0,
  updated_at: "2026-11-10T00:00:00Z",
  html_url: "https://github.com/owner/demo",
  owner: { login: "owner", avatar_url: "" },
};

beforeEach(() => {
  request.mockReset();
});

describe("GitHub snapshot provider failures", () => {
  it.each(["GitHubPermissionError", "GitHubRateLimitError", "Error"])(
    "propagates %s instead of persisting a successful partial snapshot",
    async name => {
      const failure = new Error("Synthetic provider failure");
      failure.name = name;
      request
        .mockResolvedValueOnce({ repositories: [repository], total_count: 1 })
        .mockResolvedValueOnce({ sha: "a".repeat(40) })
        .mockResolvedValueOnce({
          tree: [
            {
              path: "src/index.ts",
              mode: "100644",
              type: "blob",
              sha: "b".repeat(40),
              size: 8,
            },
          ],
          truncated: false,
        })
        .mockRejectedValueOnce(failure);
      await expect(
        buildRepositorySnapshot("synthetic-token", {
          fullName: "owner/demo",
          installationId: 1,
        })
      ).rejects.toBe(failure);
    }
  );

  it("forwards caller abort into the request-wide listing signal", async () => {
    const controller = new AbortController();
    controller.abort();
    request.mockImplementation(async (_path, _token, signal) => {
      expect(signal?.aborted).toBe(true);
      throw new Error("Synthetic abort");
    });
    await expect(
      listAccessibleGitHubRepositories("synthetic-token", controller.signal)
    ).rejects.toThrow("Synthetic abort");
  });
});
