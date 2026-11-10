export type BrowserSessionSnapshot = Readonly<{
  signedIn: boolean;
  expiresAt: string | null;
}>;

export type SessionRefreshReason =
  | "initial"
  | "login-check"
  | "activity"
  | "navigation";

export type SessionRefreshOptions = {
  reason?: SessionRefreshReason;
  now?: number;
};

export const SESSION_ACTIVITY_MIN_INTERVAL_MS = 60_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

const EMPTY_SESSION: BrowserSessionSnapshot = Object.freeze({
  signedIn: false,
  expiresAt: null,
});

let currentSession: BrowserSessionSnapshot = EMPTY_SESSION;
type SessionRequestMethod = "GET" | "POST";
let inFlightRequest: {
  method: SessionRequestMethod;
  promise: Promise<BrowserSessionSnapshot>;
} | null = null;
let lastActivityRefreshAt: number | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPublicUser(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    (typeof value.image === "string" || value.image === null)
  );
}

const INVALID_EXPIRY = Symbol("invalid-expiry");
type ParsedExpiry =
  | { kind: "missing" }
  | { kind: "valid"; value: string }
  | { kind: "expired" }
  | typeof INVALID_EXPIRY;

function parseExpiry(
  record: Record<string, unknown>,
  now: number
): ParsedExpiry {
  if (
    !("expiresAt" in record) ||
    record.expiresAt === undefined ||
    record.expiresAt === null
  ) {
    return { kind: "missing" };
  }
  if (typeof record.expiresAt !== "string") return INVALID_EXPIRY;
  const expiresAt = Date.parse(record.expiresAt);
  if (!Number.isFinite(expiresAt)) return INVALID_EXPIRY;
  return expiresAt <= now
    ? { kind: "expired" }
    : { kind: "valid", value: record.expiresAt };
}

/**
 * Accept only the public session envelope. The user object is validated but
 * deliberately not retained by this store; UI session state is only a boolean
 * and the server-provided expiry.
 */
export function parsePlatformSession(
  payload: unknown,
  now = Date.now()
): BrowserSessionSnapshot | null {
  if (!isRecord(payload) || !("user" in payload)) return null;
  if (payload.user !== null && !isPublicUser(payload.user)) return null;

  const expiresAt = parseExpiry(payload, now);
  if (expiresAt === INVALID_EXPIRY) return null;
  if (payload.user === null || expiresAt.kind === "expired")
    return EMPTY_SESSION;
  if (expiresAt.kind === "missing") return { signedIn: true, expiresAt: null };
  return { signedIn: true, expiresAt: expiresAt.value };
}

export function getBrowserSessionSnapshot(): BrowserSessionSnapshot {
  return currentSession;
}

export function getServerBrowserSessionSnapshot(): BrowserSessionSnapshot {
  return EMPTY_SESSION;
}

export function subscribeToBrowserSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifySessionListeners(): void {
  for (const listener of listeners) listener();
}

function scheduleExpiry(next: BrowserSessionSnapshot): void {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  if (!next.signedIn || !next.expiresAt) return;

  const expiresAt = next.expiresAt;
  const delay = Math.max(0, Date.parse(expiresAt) - Date.now());
  expiryTimer = setTimeout(
    () => {
      expiryTimer = null;
      if (
        currentSession.signedIn &&
        currentSession.expiresAt === expiresAt &&
        Date.parse(expiresAt) <= Date.now()
      ) {
        currentSession = EMPTY_SESSION;
        notifySessionListeners();
      } else if (
        currentSession.signedIn &&
        currentSession.expiresAt === expiresAt
      ) {
        scheduleExpiry(currentSession);
      }
    },
    Math.min(delay, MAX_TIMEOUT_MS)
  );
}

function applySessionSnapshot(
  next: BrowserSessionSnapshot
): BrowserSessionSnapshot {
  if (
    currentSession.signedIn === next.signedIn &&
    currentSession.expiresAt === next.expiresAt
  ) {
    scheduleExpiry(next);
    return currentSession;
  }

  currentSession = next;
  scheduleExpiry(next);
  notifySessionListeners();
  return currentSession;
}

function requestSession(
  method: SessionRequestMethod
): Promise<BrowserSessionSnapshot> {
  if (inFlightRequest?.method === method) return inFlightRequest.promise;
  if (inFlightRequest) {
    return inFlightRequest.promise.then(() => requestSession(method));
  }

  const request = fetch("/api/platform/session", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: "application/json",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: "{}" } : {}),
  }).then(async response => {
    if (!response.ok) throw new Error("session-request-failed");
    const parsed = parsePlatformSession(await response.json());
    if (!parsed) throw new Error("invalid-session-response");
    return applySessionSnapshot(parsed);
  });

  inFlightRequest = { method, promise: request };
  request.then(
    () => {
      if (inFlightRequest?.promise === request) inFlightRequest = null;
    },
    () => {
      if (inFlightRequest?.promise === request) inFlightRequest = null;
    }
  );
  return request;
}

/**
 * Check the server session. Activity and navigation checks share a one-minute
 * budget; concurrent checks always share the same request. Failures reject but
 * never overwrite the last validated session snapshot.
 */
export function refreshBrowserSession(
  options: SessionRefreshOptions = {}
): Promise<BrowserSessionSnapshot> {
  const reason = options.reason ?? "initial";
  const now = options.now ?? Date.now();
  const isActivity = reason === "activity" || reason === "navigation";

  if (
    isActivity &&
    lastActivityRefreshAt !== null &&
    now - lastActivityRefreshAt < SESSION_ACTIVITY_MIN_INTERVAL_MS
  ) {
    return Promise.resolve(currentSession);
  }

  if (isActivity) lastActivityRefreshAt = now;
  return requestSession(isActivity ? "POST" : "GET");
}

/** Test-only reset for pure store tests; no browser storage is involved. */
export function resetBrowserSessionForTests(): void {
  if (expiryTimer !== null) clearTimeout(expiryTimer);
  expiryTimer = null;
  currentSession = EMPTY_SESSION;
  inFlightRequest = null;
  lastActivityRefreshAt = null;
  listeners.clear();
}
