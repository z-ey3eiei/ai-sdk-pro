import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isAllowedAuthEndpoint } from "./auth";

describe("auth endpoint allowlist", () => {
  it("allows only the configured social login and session routes", () => {
    expect(isAllowedAuthEndpoint("POST", "link-social")).toBe(true);
    expect(isAllowedAuthEndpoint("POST", "sign-in/social")).toBe(true);
    for (const provider of ["github", "google"]) {
      expect(isAllowedAuthEndpoint("GET", `callback/${provider}`)).toBe(true);
      expect(isAllowedAuthEndpoint("POST", `callback/${provider}`)).toBe(true);
    }
    expect(isAllowedAuthEndpoint("GET", "get-session")).toBe(true);
    expect(isAllowedAuthEndpoint("POST", "sign-out")).toBe(true);
    expect(isAllowedAuthEndpoint("POST", "get-access-token")).toBe(false);
  });

  it.each([
    ["POST", "sign-up/email"],
    ["POST", "sign-in/email"],
    ["POST", "send-verification-email"],
    ["GET", "verify-email"],
    ["POST", "request-password-reset"],
    ["POST", "reset-password"],
    ["GET", "sign-in/social"],
    ["POST", "delete-user"],
    ["POST", "get-session/extra"],
  ])("denies removed or unsupported auth operation %s %s", (method, path) => {
    expect(isAllowedAuthEndpoint(method, path)).toBe(false);
  });
});
