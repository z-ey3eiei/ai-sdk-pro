"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getBrowserSessionSnapshot,
  getServerBrowserSessionSnapshot,
  refreshBrowserSession,
  subscribeToBrowserSession,
} from "../lib/browser-session";

function isWorkspacePath(pathname: string | null): boolean {
  return (
    pathname === "/workspace" || pathname?.startsWith("/workspace/") === true
  );
}

function isExpiredLoginLocation(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.pathname === "/login" &&
    new URLSearchParams(window.location.search).get("expired") === "1"
  );
}

export default function SessionActivity({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeToBrowserSession,
    getBrowserSessionSnapshot,
    getServerBrowserSessionSnapshot
  );
  const previousPathname = useRef(pathname);
  const skipNextNavigationRefresh = useRef(false);
  const everSignedIn = useRef(session.signedIn);
  const redirectStarted = useRef(false);

  if (session.signedIn) everSignedIn.current = true;

  useEffect(() => {
    if (isExpiredLoginLocation()) return;
    void refreshBrowserSession({ reason: "initial" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (skipNextNavigationRefresh.current) {
      skipNextNavigationRefresh.current = false;
      return;
    }
    if (document.visibilityState !== "visible") return;
    void refreshBrowserSession({ reason: "navigation" }).catch(() => undefined);
  }, [pathname]);

  useEffect(() => {
    const refreshFromActivity = (event: Event) => {
      if (!event.isTrusted || document.visibilityState !== "visible") return;
      if (!getBrowserSessionSnapshot().signedIn) return;
      void refreshBrowserSession({ reason: "activity" }).catch(() => undefined);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.isComposing ||
        ["Alt", "Control", "Meta", "Shift"].includes(event.key)
      ) {
        return;
      }
      refreshFromActivity(event);
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.matches(":focus-visible"))
        return;
      refreshFromActivity(event);
    };

    window.addEventListener("click", refreshFromActivity);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", refreshFromActivity, { passive: true });
    window.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("click", refreshFromActivity);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", refreshFromActivity);
      window.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  const expiredPrivateWorkspace =
    isWorkspacePath(pathname) && !session.signedIn && everSignedIn.current;

  useEffect(() => {
    if (!expiredPrivateWorkspace || redirectStarted.current) return;
    redirectStarted.current = true;
    // The destination explicitly opts out of the normal login session check.
    skipNextNavigationRefresh.current = true;
    router.replace("/login?expired=1");
  }, [expiredPrivateWorkspace, router]);

  if (expiredPrivateWorkspace) {
    return (
      <main aria-live="polite">
        <p>Session expired. Redirecting to login…</p>
      </main>
    );
  }

  return children;
}
