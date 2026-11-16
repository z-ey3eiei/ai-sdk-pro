import "server-only";

import { Liveblocks } from "@liveblocks/node";

import { LIVEBLOCKS_ALLOWED_ROOMS } from "./liveblocks-constants";

export { HOME_ROOM_ID } from "./liveblocks-constants";

export function isAllowedLiveblocksRoom(room: string): boolean {
  return LIVEBLOCKS_ALLOWED_ROOMS.has(room);
}

export function getLiveblocksClient(): Liveblocks | null {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY?.trim();
  if (!secret) return null;
  return new Liveblocks({ secret });
}

export async function ensureLiveblocksRoom(
  liveblocks: Liveblocks,
  roomId: string
): Promise<void> {
  try {
    await liveblocks.getRoom(roomId);
    return;
  } catch {
    // Room does not exist yet — create with token-gated access (see auth route).
  }

  await liveblocks.createRoom(roomId, {
    defaultAccesses: [],
  });
}