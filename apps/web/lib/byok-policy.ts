import {
  BYOK_PROVIDERS,
  type BYOKCredentials,
  type BYOKProviderId,
} from "./byok-config";

export const BYOK_ENABLED = true;
export const BYOK_ENDPOINTS: Readonly<Record<BYOKProviderId, string>> = Object.freeze({
  anthropic: "https://api.anthropic.com/v1",
  openai: "https://api.openai.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
});

const MIN_API_KEY_LENGTH = 16;
const MAX_API_KEY_LENGTH = 512;
const PRINTABLE_API_KEY = /^[\x21-\x7e]+$/;
const PROVIDER_IDS = new Set<string>(BYOK_PROVIDERS.map(provider => provider.id));

export class BYOKPolicyError extends Error {
  readonly status = 400;

  constructor(message = "Invalid provider credentials.") {
    super(message);
    this.name = "BYOKPolicyError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyBYOKFields(value: Record<string, unknown>) {
  return Object.keys(value).every(
    key => key === "provider" || key === "model" || key === "apiKey"
  );
}

function hasCatalogModel(provider: BYOKProviderId, model: string) {
  return BYOK_PROVIDERS.find(entry => entry.id === provider)?.models.some(
    entry => entry.id === model
  );
}

/**
 * Validate credentials without ever including the supplied key in an error.
 * The returned object is request-scoped and must not be persisted or logged.
 */
export function parseBYOK(value: unknown): BYOKCredentials {
  if (!isRecord(value) || !hasOnlyBYOKFields(value))
    throw new BYOKPolicyError();

  const provider = value.provider;
  const model = value.model;
  const apiKey = value.apiKey;

  if (
    typeof provider !== "string" ||
    !PROVIDER_IDS.has(provider) ||
    typeof model !== "string" ||
    !hasCatalogModel(provider as BYOKProviderId, model)
  )
    throw new BYOKPolicyError("That provider or model is not available.");

  if (
    typeof apiKey !== "string" ||
    apiKey.length < MIN_API_KEY_LENGTH ||
    apiKey.length > MAX_API_KEY_LENGTH ||
    !PRINTABLE_API_KEY.test(apiKey)
  )
    throw new BYOKPolicyError("Enter a valid provider API key.");

  return {
    provider: provider as BYOKProviderId,
    model,
    apiKey,
  };
}

export function isBYOKRequired() {
  return process.env.BYOK_ONLY !== "false";
}

export function requireBYOK(value: unknown): BYOKCredentials | undefined {
  if (value === undefined) {
    if (isBYOKRequired())
      throw new BYOKPolicyError("A provider API key is required.");
    return undefined;
  }
  return parseBYOK(value);
}

/** A public catalog view; it intentionally contains no credential fields. */
export function publicBYOKProviders() {
  return BYOK_PROVIDERS;
}

const UPSTREAM_STATUS_FIELDS = ["statusCode", "status"] as const;

function readStatus(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  for (const field of UPSTREAM_STATUS_FIELDS) {
    const status = value[field];
    if (typeof status === "number" && Number.isInteger(status)) return status;
  }
  const response = value.response;
  if (isRecord(response) && typeof response.status === "number")
    return response.status;
  return undefined;
}

/**
 * Preserve useful provider status classes while returning only application-safe
 * text. In particular, never serialize an SDK exception, response body, or
 * response headers because those can contain credential material.
 */
export function upstreamErrorStatus(error: unknown) {
  const status = readStatus(error);
  return status === 401 || status === 403 || status === 429 ? status : 503;
}

export function safeProviderErrorMessage(error: unknown) {
  const status = upstreamErrorStatus(error);
  if (status === 429) return "The provider is rate-limiting requests. Retry later.";
  if (status === 401 || status === 403)
    return "The provider rejected the supplied credentials.";
  return "The AI provider request failed. Retry without exposing provider details.";
}

export function safeProviderStreamError() {
  return "The AI provider request failed. Retry without exposing provider details.";
}

export { MIN_API_KEY_LENGTH, MAX_API_KEY_LENGTH };
