import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { BYOKCredentials } from "./byok-config";
import { BYOK_ENDPOINTS, parseBYOK } from "./byok-policy";

type ProviderOptionValue =
  | null
  | string
  | number
  | boolean
  | { [key: string]: ProviderOptionValue | undefined }
  | ProviderOptionValue[];
export type ProviderOptions = Record<
  string,
  { [key: string]: ProviderOptionValue | undefined }
>;

export function publicModelConfig() {
  const provider = process.env.AI_PROVIDER ?? "compatible";
  const model = process.env.AI_MODEL ?? "gpt-5-mini";
  const configured =
    provider === "anthropic"
      ? Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY)
      : Boolean(
          (process.env.AI_API_KEY && process.env.AI_BASE_URL) ||
            ((process.env.MANUS_API_KEY ||
              process.env.BUILT_IN_FORGE_API_KEY) &&
              (process.env.MANUS_API_URL || process.env.BUILT_IN_FORGE_API_URL))
        );
  return { provider, model, configured };
}

function serverProviderConfigurationError(): Error {
  return new Error("The legacy server AI provider is not configured.");
}

function getLegacyModel() {
  const { provider, model, configured } = publicModelConfig();
  if (!configured) throw serverProviderConfigurationError();

  if (provider === "anthropic")
    return createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY,
    }).messages(model);

  const external = Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL);
  const baseURL = external
    ? process.env.AI_BASE_URL!
    : `${(process.env.MANUS_API_URL || process.env.BUILT_IN_FORGE_API_URL)!.replace(/\/$/, "")}/v1`;
  const apiKey = external
    ? process.env.AI_API_KEY!
    : (process.env.MANUS_API_KEY || process.env.BUILT_IN_FORGE_API_KEY)!;
  const compatible = createOpenAICompatible({
    name: "aisdkpro",
    baseURL,
    apiKey,
    fetch: async (input, init) => {
      if (!external && init?.body && typeof init.body === "string") {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        if (model.startsWith("gpt-")) {
          body.reasoning = { effort: "minimal" };
          body.max_completion_tokens = body.max_tokens ?? 4096;
          delete body.max_tokens;
          delete body.temperature;
          delete body.top_p;
        }
        return fetch(input, { ...init, body: JSON.stringify(body) });
      }
      return fetch(input, init);
    },
  });
  return compatible.chatModel(model);
}

/**
 * Construct a provider model for exactly one request. BYOK never uses browser
 * URLs, owner credentials, or a process-global provider instance.
 */
export function getModel(byok?: BYOKCredentials) {
  if (!byok) return getLegacyModel();

  const credentials = parseBYOK(byok);
  switch (credentials.provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: credentials.apiKey,
        baseURL: BYOK_ENDPOINTS.anthropic,
      }).messages(credentials.model);
    case "openai":
      return createOpenAI({
        apiKey: credentials.apiKey,
        baseURL: BYOK_ENDPOINTS.openai,
      }).responses(credentials.model);
    case "google":
      return createGoogleGenerativeAI({
        apiKey: credentials.apiKey,
        baseURL: BYOK_ENDPOINTS.google,
      }).chat(credentials.model);
  }
}

export function providerOptionsFor(byok?: BYOKCredentials): ProviderOptions | undefined {
  if (!byok || byok.provider !== "openai") return undefined;

  const openai: { store: boolean; reasoningEffort?: string } = { store: false };
  if (byok.model === "gpt-5-mini") openai.reasoningEffort = "minimal";
  return { openai };
}

export const AGENT_MAX_OUTPUT_TOKENS = 4096;
