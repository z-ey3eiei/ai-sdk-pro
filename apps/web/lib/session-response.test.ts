import { describe, expect, it } from "vitest";
import {
  PLATFORM_SESSION_POLICY,
  SESSION_IDLE_SECONDS,
} from "./session-policy";
import { sanitizedSessionResponse } from "./session-response";

describe("persistent private sessions", () => {
  it("uses a three-hour activity-renewed database session", () => {
    expect(SESSION_IDLE_SECONDS).toBe(10800);
    expect(PLATFORM_SESSION_POLICY).toEqual({
      expiresIn: 10800,
      updateAge: 0,
      cookieCache: { enabled: false },
    });
  });
  it("forwards renewal cookies without exposing session/token/internal user fields", async () => {
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "session=synthetic-cookie; Path=/; Max-Age=10800; HttpOnly; Secure; SameSite=None"
    );
    headers.append("Set-Cookie", "other=synthetic; HttpOnly; Secure");
    const response = await sanitizedSessionResponse(
      Response.json(
        {
          user: {
            id: "test-user",
            name: "Test",
            email: "test@example.invalid",
            image: null,
            internalFlag: "not-public",
          },
          session: {
            token: "synthetic-sensitive-token",
            expiresAt: "2026-11-10T10:00:00Z",
          },
        },
        { headers }
      )
    );
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const data = await response.json();
    expect(data).toEqual({
      user: {
        id: "test-user",
        name: "Test",
        email: "test@example.invalid",
        image: null,
      },
      expiresAt: "2026-11-10T10:00:00.000Z",
    });
    expect(JSON.stringify(data)).not.toContain("synthetic-sensitive-token");
    expect(JSON.stringify(data)).not.toContain("internalFlag");
  });
  it("returns an explicit signed-out state and forwards cookie clearing", async () => {
    const response = await sanitizedSessionResponse(
      Response.json(null, {
        headers: { "Set-Cookie": "session=; Max-Age=0; HttpOnly; Secure" },
      })
    );
    expect(await response.json()).toEqual({ user: null, expiresAt: null });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
  it("does not turn an upstream failure into a confirmed sign-out", async () => {
    await expect(
      sanitizedSessionResponse(new Response("unavailable", { status: 503 }))
    ).rejects.toThrow("Session could not be verified");
  });
});
