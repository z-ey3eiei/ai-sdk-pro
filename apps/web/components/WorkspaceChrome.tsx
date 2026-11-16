"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Database,
  Globe2,
  KeyRound,
  Library,
  LoaderCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@aisdkpro/ui";
import type { PlatformSession } from "../lib/platform-types";

function displayName(user: PlatformSession["user"]): string {
  return user?.name?.trim() || user?.email?.trim() || "Signed-in account";
}

function initials(user: PlatformSession["user"]): string {
  const value = displayName(user);
  return value
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function WorkspaceChrome({
  children,
  user,
  onLogout,
  logoutPending,
  crumb = "Repositories",
}: {
  children: ReactNode;
  user: PlatformSession["user"];
  onLogout: () => void;
  logoutPending: boolean;
  crumb?: string;
}) {
  const path = usePathname();
  const reposActive = path === "/workspace" || path.startsWith("/workspace/repositories");
  const deployActive = path === "/workspace/deploy";
  const tokensActive = path === "/workspace/tokens";

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-top">
          <Brand />
          <span className="workspace-product-label">WORKSPACE</span>
        </div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <Link
            href="/workspace"
            className={`workspace-nav-item${reposActive ? " active" : ""}`}
          >
            <Library size={16} />
            <span>Repositories</span>
          </Link>
          <Link
            href="/workspace/deploy"
            className={`workspace-nav-item${deployActive ? " active" : ""}`}
          >
            <Globe2 size={16} />
            <span>Deploy projects</span>
          </Link>
          <Link
            href="/workspace/tokens"
            className={`workspace-nav-item${tokensActive ? " active" : ""}`}
          >
            <KeyRound size={16} />
            <span>API tokens</span>
          </Link>
          <Link href="/docs/architecture" className="workspace-nav-item">
            <Database size={16} />
            <span>How snapshots work</span>
            <ArrowUpRight className="workspace-nav-external" size={12} />
          </Link>
        </nav>
        <div className="workspace-sidebar-note">
          <ShieldCheck size={15} />
          <p>
            เส้นทางเดียว: เลือก repo → นำเข้า snapshot เพื่อตรวจโค้ด → เผยแพร่เว็บจาก Git ใน Deploy
            (ล็อกอิน pilot ของ Cloudflare ครั้งแรกในแผง Deploy)
          </p>
        </div>
        <div className="workspace-sidebar-footer">
          <span className="workspace-sidebar-kicker">AI-SDK.PRO</span>
          <span>Import + deploy</span>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb">
            <Link href="/workspace">Workspace</Link>
            <ChevronRight size={14} />
            <span>{crumb}</span>
          </div>
          <div className="workspace-account">
            {user ? (
              <>
                <span className="workspace-account-copy">
                  <strong>{displayName(user)}</strong>
                  <span>GitHub account</span>
                </span>
                <span className="workspace-avatar" aria-hidden="true">
                  {initials(user)}
                </span>
                <button
                  type="button"
                  className="workspace-icon-button"
                  onClick={onLogout}
                  disabled={logoutPending}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  {logoutPending ? (
                    <LoaderCircle className="workspace-spin" size={15} />
                  ) : (
                    <LogOut size={15} />
                  )}
                </button>
              </>
            ) : (
              <Link href="/login" className="workspace-sign-in-link">
                Sign in
              </Link>
            )}
          </div>
        </header>
        <div className="workspace-content">{children}</div>
      </section>
    </main>
  );
}