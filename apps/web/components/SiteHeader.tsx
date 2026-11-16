"use client";

import { Header } from "@aisdkpro/ui";
import { useSyncExternalStore, type ComponentProps } from "react";
import {
  getBrowserSessionSnapshot,
  getServerBrowserSessionSnapshot,
  subscribeToBrowserSession,
} from "../lib/browser-session";

type SiteHeaderProps = Omit<
  ComponentProps<typeof Header>,
  "accountHref" | "accountLabel" | "deployHref"
>;

export default function SiteHeader(props: SiteHeaderProps) {
  const session = useSyncExternalStore(
    subscribeToBrowserSession,
    getBrowserSessionSnapshot,
    getServerBrowserSessionSnapshot
  );

  return (
    <Header
      {...props}
      deployHref="/deploy"
      accountHref={session.signedIn ? "/workspace" : "/login"}
      accountLabel={session.signedIn ? "Dashboard" : "Log in"}
    />
  );
}
