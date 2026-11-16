"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CircleAlert, Github, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import type { PlatformSession, PlatformStatus } from "../lib/platform-types";
import {
  presentRepositoryRequestError,
  RepositoryRequestError,
} from "../lib/repository-request-error";
import WorkspaceChrome from "./WorkspaceChrome";
import WorkspaceDeployPanel from "./WorkspaceDeployPanel";

type Phase = "loading" | "ready" | "signed-out" | "setup" | "error";

async function requestJson<T>(
  path: string,
  signal: AbortSignal,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal,
  });

  if (!response.ok) {
    throw new RepositoryRequestError(response.status);
  }

  return (await response.json()) as T;
}

export default function WorkspaceDeployView() {
  const searchParams = useSearchParams();
  const repoHint = searchParams.get("repo");
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [session, setSession] = useState<PlatformSession>({ user: null });
  const [requestError, setRequestError] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function load() {
      setPhase("loading");
      setRequestError(null);
      try {
        const [nextStatus, nextSession] = await Promise.all([
          requestJson<PlatformStatus>("/api/platform/status", controller.signal),
          requestJson<PlatformSession>("/api/platform/session", controller.signal),
        ]);
        if (!mounted) return;

        setStatus(nextStatus);
        setSession(nextSession);

        if (!nextStatus.configured) {
          setPhase("setup");
          return;
        }
        if (!nextSession.user) {
          setPhase("signed-out");
          return;
        }
        setPhase("ready");
      } catch (error) {
        if (!mounted || (error as { name?: string }).name === "AbortError") return;
        const issue = presentRepositoryRequestError(error);
        setRequestError(issue.message);
        if (issue.kind === "signed-out") {
          setSession({ user: null });
          setPhase("signed-out");
        } else if (issue.kind === "setup") {
          setPhase("setup");
        } else {
          setPhase("error");
        }
      }
    }

    void load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  async function handleLogout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("logout-failed");
      window.location.assign("/login");
    } catch {
      setRequestError("Sign out did not complete. Please try again.");
      setLogoutPending(false);
    }
  }

  return (
    <WorkspaceChrome
      user={session.user}
      onLogout={handleLogout}
      logoutPending={logoutPending}
      crumb="Deploy projects"
    >
      {phase === "loading" && (
        <section className="workspace-state-panel">
          <LoaderCircle className="workspace-spin" size={22} />
          <h2>กำลังโหลด Workspace</h2>
          <p>ตรวจสอบ session ก่อนเปิดแผง Deploy</p>
        </section>
      )}

      {phase === "error" && (
        <section className="workspace-state-panel">
          <CircleAlert size={22} />
          <h2>เปิด Deploy ไม่ได้</h2>
          <p>{requestError || "โหลดข้อมูล workspace ไม่สำเร็จ"}</p>
          <button
            type="button"
            className="workspace-button workspace-button-secondary"
            onClick={() => setRefreshKey(value => value + 1)}
          >
            <RefreshCw size={14} /> ลองอีกครั้ง
          </button>
        </section>
      )}

      {phase === "signed-out" && (
        <section className="workspace-state-panel">
          <Github size={22} />
          <h2>ล็อกอินก่อนเผยแพร่</h2>
          <p>ใช้ GitHub เดียวกับการนำเข้า snapshot ใน Workspace</p>
          <Link href="/login" className="workspace-button workspace-button-primary">
            ไปหน้า login <ArrowUpRight size={14} />
          </Link>
        </section>
      )}

      {phase === "setup" && (
        <section className="workspace-state-panel">
          <CircleAlert size={22} />
          <h2>ยังตั้งค่า platform ไม่ครบ</h2>
          <p>
            {status?.missingConfiguration?.length
              ? `ขาด: ${status.missingConfiguration.join(", ")}`
              : "เจ้าของระบบต้องตั้งค่า GitHub App / Neon ให้เสร็จก่อน"}
          </p>
        </section>
      )}

      {phase === "ready" && (
        <>
          <section className="workspace-hero workspace-hero-compact">
            <div>
              <span className="workspace-eyebrow">PUBLISH FROM GIT</span>
              <h1>เผยแพร่โปรเจกต์</h1>
              <p>
                {repoHint ? (
                  <>
                    กำลังเตรียม repository <strong>{repoHint}</strong> ในแผงด้านล่าง
                    (ล็อกอิน pilot Cloudflare ครั้งแรกถ้ายังไม่เคย)
                  </>
                ) : (
                  <>
                    เลือก repository จากแท็บ GitHub แล้วกดนำเข้า — ระบบจะพาคุณมาที่นี่โดยอัตโนมัติ
                    หรือเลือก repo ในแผง Deploy โดยตรง
                  </>
                )}
              </p>
            </div>
          </section>
          {requestError && (
            <div className="workspace-inline-alert" role="alert">
              <CircleAlert size={15} />
              <span>{requestError}</span>
            </div>
          )}
          <WorkspaceDeployPanel repoHint={repoHint} />
        </>
      )}
    </WorkspaceChrome>
  );
}