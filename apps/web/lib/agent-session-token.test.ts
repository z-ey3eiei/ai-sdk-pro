import { describe, expect, it } from "vitest";
import {
  AGENT_TOKEN_TTL_SECONDS,
  issueAgentSessionToken,
  validAgentThreadId,
  verifyAgentSessionToken,
} from "./agent-session-token";

const secret = "synthetic-agent-auth-secret-longer-than-32-bytes";
const now = Date.UTC(2026, 10, 17, 0, 0);

describe("signed edge agent session tokens", () => {
  it("binds user and thread to an authenticated, short-lived claim", () => {
    const { token, expiresAt } = issueAgentSessionToken("user-A", "thread-1", secret, now);
    expect(expiresAt).toBe(new Date(now + AGENT_TOKEN_TTL_SECONDS * 1000).toISOString());
    expect(verifyAgentSessionToken(token, secret, now + 20000)).toMatchObject({
      sub: "user-A", tid: "thread-1", aud: "ai-sdk-pro-agent",
    });
  });
  it("rejects expiry, tampering and another signing key", () => {
    const { token } = issueAgentSessionToken("user-A", "thread-1", secret, now);
    expect(verifyAgentSessionToken(token, secret, now + 61000)).toBeNull();
    const parts = token.split(".");
    expect(verifyAgentSessionToken(`${parts[0]}x.${parts[1]}`, secret, now)).toBeNull();
    expect(verifyAgentSessionToken(token, "other-synthetic-long-secret-over-32-bytes", now)).toBeNull();
  });
  it("never permits empty, path-traversal or cross-thread identifiers", () => {
    for (const bad of ["", "../other", "team:other", "name/2", " space ", "x".repeat(65)]) {
      expect(validAgentThreadId(bad)).toBe(false);
    }
    expect(validAgentThreadId("my_thread-2")).toBe(true);
    expect(() => issueAgentSessionToken("user-A", "../other", secret, now)).toThrow();
    expect(() => issueAgentSessionToken("user-A", "thread-1", "short", now)).toThrow();
  });
  it("uses unique nonce so consecutive issued tokens do not alias", () => {
    const a = issueAgentSessionToken("user-A", "thread-1", secret, now).token;
    const b = issueAgentSessionToken("user-A", "thread-1", secret, now).token;
    expect(a).not.toBe(b);
  });
});
