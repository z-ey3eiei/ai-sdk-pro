import type { PlatformSession, PlatformUser } from "./platform-types";

export async function sanitizedSessionResponse(
  response: Response
): Promise<Response> {
  if (!response.ok) {
    throw new Error("Session could not be verified.");
  }
  const payload = (await response.json()) as {
    user?: PlatformUser | null;
    session?: { expiresAt?: string | Date | null } | null;
  } | null;
  const user = payload?.user;
  const publicSession: PlatformSession = {
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        }
      : null,
    expiresAt:
      user && payload?.session?.expiresAt
        ? new Date(payload.session.expiresAt).toISOString()
        : null,
  };
  const headers = new Headers({
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  });
  for (const cookie of response.headers.getSetCookie()) {
    headers.append("Set-Cookie", cookie);
  }
  return Response.json(publicSession, { headers });
}
