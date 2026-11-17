import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  getOwnedRepository: vi.fn(),
  sql: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireSessionUser: mocks.requireSessionUser }));
vi.mock("@/lib/repository-queries", () => ({ getOwnedRepository: mocks.getOwnedRepository }));
vi.mock("@neondatabase/serverless", () => ({ neon: () => mocks.sql }));
vi.mock("@/lib/platform-policy", () => ({
  checkPlatformRateLimit: () => true,
  getPlatformConfig: () => ({ configured: true }),
  isTrustedMutationOrigin: (request: Request) => request.headers.get("origin") === "https://ai-sdk.pro",
  jsonError: (error: string, status: number) => Response.json({ error }, { status }),
  noStoreHeaders: () => ({ "Cache-Control": "no-store" }),
  safePlatformError: () => ({ message: "Service unavailable.", status: 503 }),
}));

import { GET, POST } from "./route";

const repo = {
  id: "repo-1",
  fullName: "example/owned",
  commitSha: "a".repeat(40),
  defaultBranch: "main",
};
const ctx = { params: Promise.resolve({ id: "repo-1" }) };
const getReq = () => new Request("https://ai-sdk.pro/api/repositories/repo-1/preview");
const postReq = () => new Request("https://ai-sdk.pro/api/repositories/repo-1/preview", {
  method: "POST",
  headers: { Origin: "https://ai-sdk.pro" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSessionUser.mockResolvedValue({ id: "user-A" });
  mocks.getOwnedRepository.mockResolvedValue(repo);
  mocks.sql.mockImplementation(async (parts: TemplateStringsArray) => {
    const statement = parts.join(" ");
    if (statement.includes("INSERT INTO")) return [{ delivery_id: "synthetic-delivery" }];
    if (statement.includes("FROM aisdk_pro.deployment_intake")) return [];
    return [{ id: "project-1", auto_deploy: true }];
  });
});

describe("preview dispatch safety (synthetic SQL only)", () => {
  it("does not query or dispatch another user's repository", async () => {
    mocks.getOwnedRepository.mockResolvedValue(null);
    expect((await POST(postReq(), ctx)).status).toBe(404);
    expect((await GET(getReq(), ctx)).status).toBe(404);
    expect(mocks.getOwnedRepository).toHaveBeenCalledWith("user-A", "repo-1");
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("rejects mutations without trusted Origin", async () => {
    const response = await POST(new Request("https://ai-sdk.pro/api/repositories/repo-1/preview", {
      method: "POST", headers: { Origin: "https://other.invalid" },
    }), ctx);
    expect(response.status).toBe(403);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("queues only pinned SHA metadata, with no repo execution", async () => {
    const response = await POST(postReq(), ctx);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ queued: true });
    expect(mocks.sql).toHaveBeenCalledTimes(1);
  });

  it("returns conflict when same preview commit was already queued", async () => {
    mocks.sql.mockResolvedValue([]);
    expect((await POST(postReq(), ctx)).status).toBe(409);
  });

  it("rejects imported source with malformed pinned SHA", async () => {
    mocks.getOwnedRepository.mockResolvedValue({ ...repo, commitSha: "../malicious" });
    expect((await POST(postReq(), ctx)).status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
