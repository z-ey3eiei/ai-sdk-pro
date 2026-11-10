import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BYOK_ENDPOINTS,
  BYOKPolicyError,
  isBYOKRequired,
  parseBYOK,
  requireBYOK,
  safeProviderErrorMessage,
  upstreamErrorStatus,
} from "./byok-policy";
import { BYOK_PROVIDERS } from "./byok-config";
import { getModel } from "./provider";

afterEach(() => vi.unstubAllEnvs());

const validKey = "k".repeat(32);

function credentials(provider: "anthropic" | "openai" | "google", model: string) {
  return { provider, model, apiKey: validKey } as const;
}

describe("BYOK request policy", () => {
  it("uses only the fixed provider endpoints and catalog models", () => {
    expect(BYOK_ENDPOINTS).toEqual({
      anthropic: "https://api.anthropic.com/v1",
      openai: "https://api.openai.com/v1",
      google: "https://generativelanguage.googleapis.com/v1beta",
    });
    for (const provider of BYOK_PROVIDERS)
      for (const model of provider.models)
        expect(() =>
          parseBYOK(credentials(provider.id, model.id))
        ).not.toThrow();
  });

  it.each([
    { provider: "other", model: "gpt-5-mini" },
    { provider: "openai", model: "not-in-catalog" },
  ])("rejects unknown provider/model: $provider/$model", input => {
    expect(() => parseBYOK({ ...input, apiKey: validKey })).toThrow(
      BYOKPolicyError
    );
  });

  it("rejects missing, short, long, whitespace, and browser endpoint credentials", () => {
    expect(() => requireBYOK(undefined)).toThrow("required");
    expect(() => parseBYOK({})).toThrow(BYOKPolicyError);
    expect(() =>
      parseBYOK({ ...credentials("openai", "gpt-5-mini"), apiKey: "short" })
    ).toThrow("valid provider API key");
    expect(() =>
      parseBYOK({
        ...credentials("openai", "gpt-5-mini"),
        apiKey: "k".repeat(16) + "\n",
      })
    ).toThrow(BYOKPolicyError);
    expect(() =>
      parseBYOK({
        ...credentials("openai", "gpt-5-mini"),
        apiKey: "k".repeat(513),
      })
    ).toThrow(BYOKPolicyError);
    expect(() =>
      parseBYOK({
        ...credentials("openai", "gpt-5-mini"),
        baseURL: "https://attacker.example",
      })
    ).toThrow(BYOKPolicyError);
  });

  it("never includes a supplied key in policy or upstream error text", () => {
    const secret = "s".repeat(32);
    let message = "";
    try {
      parseBYOK({ provider: "openai", model: "bad", apiKey: secret });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toContain(secret);
    const upstream = new Error(`401 body contains ${secret}`) as Error & {
      statusCode: number;
    };
    upstream.statusCode = 401;
    expect(safeProviderErrorMessage(upstream)).not.toContain(secret);
    expect(upstreamErrorStatus(upstream)).toBe(401);
  });

  it("defaults public requests to BYOK and allows legacy mode only explicitly", () => {
    expect(isBYOKRequired()).toBe(true);
    vi.stubEnv("BYOK_ONLY", "false");
    expect(isBYOKRequired()).toBe(false);
    expect(requireBYOK(undefined)).toBeUndefined();
  });
});

describe("request-scoped provider construction", () => {
  it("does not fall back to owner credentials and creates isolated models", () => {
    vi.stubEnv("AI_API_KEY", "owner-secret-that-must-not-be-used");
    vi.stubEnv("AI_BASE_URL", "https://owner.example/v1");
    const first = getModel(credentials("openai", "gpt-5-mini"));
    const second = getModel({
      ...credentials("anthropic", "claude-sonnet-4-6"),
      apiKey: "z".repeat(32),
    });
    expect(first).not.toBe(second);
    expect(first.modelId).toBe("gpt-5-mini");
    expect(second.modelId).toBe("claude-sonnet-4-6");
    expect(first.provider).toContain("openai");
    expect(second.provider).toContain("anthropic");
  });
});
