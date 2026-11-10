import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";

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
export function getModel() {
  const { provider, model, configured } = publicModelConfig();
  if (!configured)
    throw new Error(
      "AI provider is not configured. Set AI_API_KEY and AI_BASE_URL, or ANTHROPIC_API_KEY, on the server."
    );
  if (provider === "anthropic")
    return createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY,
    })(model);
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
