import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getBrowserSessionSnapshot,
  refreshBrowserSession,
  resetBrowserSessionForTests,
} from "./browser-session";

const user = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: null,
};

function sessionResponse(expiresAt: string | null = null): Response {
  return new Response(JSON.stringify({ user, expiresAt }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function seedSignedIn(expiresAt: string | null = null): Promise<void> {
  vi.mocked(fetch).mockResolvedValueOnce(sessionResponse(expiresAt));
  await refreshBrowserSession({ reason: "initial" });
}

afterEach(() => {
  resetBrowserSessionForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("browser session store", () => {
  it("uses renewal POST for an explicit activity check", async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: null, expiresAt: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await refreshBrowserSession({ reason: "activity", now: 120_000 });

    expect(fetch).toHaveBeenCalledWith(
      "/api/platform/session",
      expect.objectContaining({ method: "POST", body: "{}" })
    );
  });

  it("deduplicates concurrent activity checks and bounds them to once per minute", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await seedSignedIn();
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/platform/session",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      })
    );

    let resolveRequest!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise<Response>(resolve => {
        resolveRequest = resolve;
      })
    );

    const first = refreshBrowserSession({ reason: "activity", now: 120_000 });
    const second = refreshBrowserSession({ reason: "activity", now: 120_001 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/platform/session",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        body: "{}",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
    );

    resolveRequest(sessionResponse());
    await Promise.all([first, second]);

    await refreshBrowserSession({ reason: "activity", now: 120_500 });
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.mocked(fetch).mockResolvedValueOnce(sessionResponse());
    await refreshBrowserSession({ reason: "activity", now: 180_001 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("preserves a signed-in snapshot when the server check fails", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await seedSignedIn();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));

    await expect(
      refreshBrowserSession({ reason: "activity", now: 120_000 })
    ).rejects.toThrow("offline");
    expect(getBrowserSessionSnapshot()).toEqual({
      signedIn: true,
      expiresAt: null,
    });
  });

  it("clears the UI snapshot at the validated server expiry without another request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T00:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    await seedSignedIn("2026-11-10T00:00:01.000Z");

    expect(getBrowserSessionSnapshot()).toEqual({
      signedIn: true,
      expiresAt: "2026-11-10T00:00:01.000Z",
    });

    vi.advanceTimersByTime(1_001);
    expect(getBrowserSessionSnapshot()).toEqual({
      signedIn: false,
      expiresAt: null,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps only signed-in state and expiry, never the public user or browser storage", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await seedSignedIn("2027-11-10T03:00:00.000Z");

    const snapshot = getBrowserSessionSnapshot();
    expect(snapshot).toEqual({
      signedIn: true,
      expiresAt: "2027-11-10T03:00:00.000Z",
    });
    expect("user" in snapshot).toBe(false);
    expect("localStorage" in globalThis).toBe(false);
  });
});
