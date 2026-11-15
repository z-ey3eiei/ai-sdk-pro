import { createHash, randomUUID } from "node:crypto";

export const LIVEBLOCKS_GUEST_COOKIE = "aisdkpro_lb_guest";

const GUEST_COLORS = [
  "#7c9cff",
  "#52d1b0",
  "#f5b942",
  "#f27b7b",
  "#c58cff",
] as const;

export type LiveblocksActor = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  guestCookie?: string;
};

function colorForId(userId: string): string {
  const hash = createHash("sha256").update(userId).digest();
  return GUEST_COLORS[hash[0]! % GUEST_COLORS.length] ?? GUEST_COLORS[0];
}

function guestAvatar(name: string): string {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(name)}`;
}

function parseCookieHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export function resolveLiveblocksActor(request: Request, authUser: {
  id: string;
  name: string;
  image?: string | null;
} | null): LiveblocksActor {
  if (authUser) {
    const name = authUser.name?.trim() || "Member";
    return {
      id: `user:${authUser.id}`,
      name,
      avatar: authUser.image?.trim() || guestAvatar(name),
      color: colorForId(authUser.id),
    };
  }

  const existingGuest = parseCookieHeader(
    request.headers.get("cookie"),
    LIVEBLOCKS_GUEST_COOKIE
  );
  const guestId =
    existingGuest && existingGuest.length >= 8
      ? existingGuest
      : randomUUID().replace(/-/g, "");
  const name = `Guest ${guestId.slice(0, 4).toUpperCase()}`;

  return {
    id: `guest:${guestId}`,
    name,
    avatar: guestAvatar(name),
    color: colorForId(guestId),
    guestCookie: existingGuest ? undefined : guestId,
  };
}