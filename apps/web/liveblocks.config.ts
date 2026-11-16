import { LiveObject } from "@liveblocks/client";

// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    Presence: {
      focus: "hero" | "ideas" | "browse";
    };

    Storage: {
      heroDraft: LiveObject<{ text: string }>;
      ideas: LiveObject<{
        items: string[];
      }>;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    RoomEvent: {};
    ThreadMetadata: {};
    RoomInfo: {};
  }
}

export {};