"use client";

import { InstallCommand } from "@aisdkpro/ui";
import HomeCollaboration from "./liveblocks/HomeCollaboration";
import { HomeLiveblocksRoom } from "./liveblocks/HomeRoom";

export default function HomeHeroInteractive() {
  return (
    <>
      <div className="hero-install">
        <InstallCommand command="npx create-ai-sdk-pro@latest my-app" />
        <span>Scaffold a fresh project from the latest published starter package.</span>
      </div>
      <HomeLiveblocksRoom>
        <HomeCollaboration />
      </HomeLiveblocksRoom>
    </>
  );
}