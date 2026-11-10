import { afterEach, describe, expect, it, vi } from "vitest";
import {
  corsHeaders,
  isAllowedOrigin,
  requestIdentity,
  checkRateLimit,
} from "./chat-policy";
import { readLimitedBody, withAbort } from "./request-limits";

afterEach(() => vi.unstubAllEnvs());
describe("chat request policy", () => {
  it("reflects only an approved cross-origin client", () => {
    vi.stubEnv("APP_ORIGINS", "https://client.example");
    const req = new Request("https://ai-sdk.pro/api/chat", {
      headers: { Origin: "https://client.example" },
    });
    expect(isAllowedOrigin(req)).toBe(true);
    expect(corsHeaders(req).get("Access-Control-Allow-Origin")).toBe(
      "https://client.example"
    );
    expect(corsHeaders(req).get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS"
    );
    expect(
      isAllowedOrigin(
        new Request("https://ai-sdk.pro/api/chat", {
          headers: { Origin: "https://bad.example" },
        })
      )
    ).toBe(false);
  });
  it("ignores forged forwarding identity unless explicitly behind a trusted edge", () => {
    vi.stubEnv("TRUST_PROXY", "false");
    const req = new Request("https://ai-sdk.pro/api/chat", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "1.2.3.4" },
    });
    expect(requestIdentity(req)).toBe("shared-anonymous");
    vi.stubEnv("TRUST_PROXY", "true");
    expect(requestIdentity(req)).toBe("1.2.3.4");
  });
  it("bounds each anonymous quota", () => {
    const now = 1000000;
    for (let i = 0; i < 20; i++)
      expect(checkRateLimit("test-identity", now)).toBe(true);
    expect(checkRateLimit("test-identity", now)).toBe(false);
    expect(checkRateLimit("test-identity", now + 60001)).toBe(true);
  });
  it("rejects oversized declared and actual bodies", async () => {
    const signal = new AbortController().signal;
    await expect(
      readLimitedBody(
        new Request("https://example.com", {
          method: "POST",
          body: "small",
          headers: { "content-length": "200000" },
        }),
        signal
      )
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readLimitedBody(
        new Request("https://example.com", { method: "POST", body: "éééé" }),
        signal,
        4
      )
    ).rejects.toMatchObject({ status: 413 });
  });
  it("decodes a bounded body and respects an already-aborted deadline", async () => {
    expect(
      await readLimitedBody(
        new Request("https://example.com", {
          method: "POST",
          body: '{"ok":true}',
        }),
        new AbortController().signal
      )
    ).toBe('{"ok":true}');
    const controller = new AbortController();
    controller.abort(new Error("deadline"));
    await expect(
      withAbort(Promise.resolve(1), controller.signal)
    ).rejects.toThrow("deadline");
  });
});
