"use client";

import { LiveObject } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { HOME_ROOM_ID } from "@/lib/liveblocks-constants";

function CollabLoading() {
  return (
    <div className="home-collab-shell home-collab-shell--loading" aria-busy="true">
      <p>Connecting live workspace…</p>
    </div>
  );
}

export function HomeLiveblocksRoom({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={HOME_ROOM_ID}
        initialPresence={{ focus: "hero" }}
        initialStorage={{
          heroDraft: new LiveObject({
            text: "Ship a tool-enabled agent on my VPS with streaming UI…",
          }),
          ideas: new LiveObject({
            items: [
              "Wire /api/chat to a ToolLoopAgent",
              "Add BYOK provider settings",
              "Deploy with Docker + Caddy",
            ],
          }),
        }}
      >
        <ClientSideSuspense fallback={<CollabLoading />}>{children}</ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}