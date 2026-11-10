import { isIP } from "node:net";
const requests = new Map<string, { startedAt: number; count: number }>();
const WINDOW = 60000;
const MAX_ENTRIES = 1000;
let globalWindow = { startedAt: 0, count: 0 };
export function checkRateLimit(key: string, now = Date.now()) {
  if (now - globalWindow.startedAt >= WINDOW)
    globalWindow = { startedAt: now, count: 0 };
  if (globalWindow.count >= 120) return false;
  for (const [id, row] of requests)
    if (now - row.startedAt >= WINDOW) requests.delete(id);
  const row = requests.get(key);
  if (!row) {
    if (requests.size >= MAX_ENTRIES) return false;
    requests.set(key, { startedAt: now, count: 1 });
    globalWindow.count++;
    return true;
  }
  if (row.count >= 20) return false;
  row.count++;
  globalWindow.count++;
  return true;
}
export function requestIdentity(request: Request) {
  // Enable only behind a private listener whose trusted edge overwrites X-Real-IP.
  // Never accept arbitrary client X-Forwarded-For as identity.
  if (process.env.TRUST_PROXY === "true") {
    const ip = request.headers.get("x-real-ip")?.trim();
    if (ip && ip.length <= 64 && isIP(ip)) return ip;
  }
  return "shared-anonymous";
}
export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // CLI/server clients. Origin policy is not authentication.
  const configured = (process.env.APP_ORIGINS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;
  try {
    const incoming = new URL(origin);
    const requestUrl = new URL(request.url);
    const publicHost =
      process.env.TRUST_PROXY === "true"
        ? request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
          request.headers.get("host") ||
          requestUrl.host
        : request.headers.get("host") || requestUrl.host;
    return (
      incoming.host === publicHost &&
      ["http:", "https:"].includes(incoming.protocol)
    );
  } catch {
    return false;
  }
}
export function corsHeaders(request: Request) {
  const headers = new Headers({ Vary: "Origin" });
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(request)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set(
      "Access-Control-Expose-Headers",
      "x-vercel-ai-ui-message-stream"
    );
  }
  return headers;
}
