import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPlatformConfig,
  isTrustedMutationOrigin,
  platformStatus,
} from "./platform-policy";

afterEach(() => vi.unstubAllEnvs());

describe("platform configuration", () => {
  it("reports setup-required variables without opening a database", () => {
    vi.stubEnv("NEON_DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");
    vi.stubEnv("GITHUB_APP_SLUG", "");
    expect(getPlatformConfig().configured).toBe(false);
    expect(platformStatus().missingConfiguration).toEqual(
      expect.arrayContaining([
        "NEON_DATABASE_URL",
        "BETTER_AUTH_SECRET",
        "GITHUB_CLIENT_ID",
        "GITHUB_CLIENT_SECRET",
      ])
    );
    expect(platformStatus().githubAppInstallUrl).toBe(
      "https://github.com/apps/ai-sdk-pro/installations/new"
    );
  });

  it("only accepts the fixed HTTPS origin for mutations", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://ai-sdk.pro");
    expect(
      isTrustedMutationOrigin(
        new Request("https://ai-sdk.pro/api/repositories", {
          headers: { Origin: "https://ai-sdk.pro" },
        })
      )
    ).toBe(true);
    expect(
      isTrustedMutationOrigin(
        new Request("https://ai-sdk.pro/api/repositories", {
          headers: { Origin: "https://evil.example" },
        })
      )
    ).toBe(false);
    expect(
      isTrustedMutationOrigin(
        new Request("https://ai-sdk.pro/api/repositories")
      )
    ).toBe(false);
  });
});
