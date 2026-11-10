import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isAllowedAuthEndpoint } from "./auth";

describe("auth endpoint allowlist", () => {
  it("allows only sign-in/social, callback/github, get-session, and sign-out", () => {
    expect(isAllowedAuthEndpoint("POST", "sign-in/social")).toBe(true);
    expect(isAllowedAuthEndpoint("GET", "callback/github")).toBe(true);
    expect(isAllowedAuthEndpoint("POST", "sign-out")).toBe(true);
    expect(isAllowedAuthEndpoint("POST", "get-access-token")).toBe(false);
    expect(isAllowedAuthEndpoint("POST", "link-social")).toBe(false);
    expect(isAllowedAuthEndpoint("GET", "list-accounts")).toBe(false);
  });
});
