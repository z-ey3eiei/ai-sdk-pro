import "server-only";

const GITHUB_API_ORIGIN = "https://api.github.com";
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

export class GitHubPermissionError extends Error {
  constructor(message = "GitHub access was denied.") {
    super(message);
    this.name = "GitHubPermissionError";
  }
}
export class GitHubRateLimitError extends Error {
  constructor() {
    super("GitHub is rate limiting requests.");
    this.name = "GitHubRateLimitError";
  }
}
export class PlatformRequestTimeoutError extends Error {
  constructor() {
    super("The GitHub request timed out.");
    this.name = "PlatformRequestTimeoutError";
  }
}

export async function githubRequest<T>(
  path: string,
  accessToken: string,
  signal?: AbortSignal
): Promise<T> {
  const url = new URL(path, GITHUB_API_ORIGIN);
  if (url.origin !== GITHUB_API_ORIGIN || !url.pathname.startsWith("/"))
    throw new Error("Invalid GitHub API path.");
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ai-sdk.pro-repository-import",
      },
      redirect: "error",
      cache: "no-store",
      signal: requestSignal,
    });
  } catch (error) {
    if (requestSignal.aborted) throw new PlatformRequestTimeoutError();
    throw error;
  }
  if (response.status === 401 || response.status === 403) {
    if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")
      throw new GitHubRateLimitError();
    throw new GitHubPermissionError();
  }
  if (response.status === 429) throw new GitHubRateLimitError();
  if (!response.ok) {
    // Do not include the provider response body in errors or logs.
    throw new Error(`GitHub request failed with status ${response.status}.`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("GitHub returned an empty response.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) throw new Error("GitHub response exceeded the byte limit.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T;
  } catch {
    throw new Error("GitHub returned an invalid response.");
  }
}

export function githubApiPath(...segments: string[]): string {
  return `/${segments.map(segment => encodeURIComponent(segment)).join("/")}`;
}

export { GITHUB_API_ORIGIN };
