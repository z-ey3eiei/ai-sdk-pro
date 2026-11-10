export const BYOK_PROVIDERS = [
  {
    id: "anthropic",
    label: "Anthropic · Claude",
    keyPlaceholder: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI · GPT",
    keyPlaceholder: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-5-mini", label: "GPT-5 mini" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    ],
  },
  {
    id: "google",
    label: "Google · Gemini",
    keyPlaceholder: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
] as const;

export type BYOKProviderId = (typeof BYOK_PROVIDERS)[number]["id"];

export interface BYOKCredentials {
  provider: BYOKProviderId;
  model: string;
  apiKey: string;
}
