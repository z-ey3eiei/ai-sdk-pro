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
      ])
    );
    expect(platformStatus().githubConfigured).toBe(false);
    expect(platformStatus().socialProviders).toEqual({
      github: false, google: false,
    });
    expect(platformStatus().missingConfiguration).not.toContain("GITHUB_CLIENT_ID");
    expect(platformStatus().githubAppInstallUrl).toBe(
      "https://github.com/apps/ai-sdk-pro/installations/new"
    );
  });

  it("allows the platform to load with no optional social provider configured", () => {
    vi.stubEnv("NEON_DATABASE_URL", "postgres://unit-test");
    vi.stubEnv("BETTER_AUTH_SECRET", "test-only-secret");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("FACEBOOK_CLIENT_ID", "");
    vi.stubEnv("FACEBOOK_CLIENT_SECRET", "");
    vi.stubEnv("APPLE_CLIENT_ID", "");
    vi.stubEnv("APPLE_CLIENT_SECRET", "");
    expect(getPlatformConfig().configured).toBe(true);
    expect(getPlatformConfig().githubConfigured).toBe(false);
    expect(platformStatus().socialProviders).toEqual({
      github: false, google: false,
    });
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
