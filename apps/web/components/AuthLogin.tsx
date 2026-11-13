"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Github, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@aisdkpro/ui";
import styles from "./AuthLogin.module.css";
import { authClient } from "../lib/auth-client";
import {
  getBrowserSessionSnapshot,
  refreshBrowserSession,
} from "../lib/browser-session";
import type { PlatformStatus } from "../lib/platform-types";

type StatusState =
  | { kind: "loading" }
  | { kind: "ready"; status: PlatformStatus }
  | { kind: "error" };
type SessionState = "loading" | "signed-out" | "signed-in" | "error";

async function readStatus(signal: AbortSignal): Promise<PlatformStatus> {
  const response = await fetch("/api/platform/status", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error("status-request-failed");
  }

  return (await response.json()) as PlatformStatus;
}

export default function AuthLogin() {
  const router = useRouter();
  const [statusState, setStatusState] = useState<StatusState>({ kind: "loading" });
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [oauthReturned, setOauthReturned] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    const params = new URLSearchParams(window.location.search);
    const expired = params.get("expired") === "1";
    setExpiredNotice(expired);

    if (expired) {
      // Do not silently check/renew a session on an expiry destination.
      setSessionState("signed-out");
    } else {
      void refreshBrowserSession({ reason: "login-check" })
        .then(session => {
          if (!mounted) return;
          if (session.signedIn) {
            setSessionState("signed-in");
            router.replace("/workspace");
          } else {
            setSessionState("signed-out");
          }
        })
        .catch(() => {
          if (!mounted) return;
          // A failed request is not confirmation of logout. Preserve any
          // previously validated signed-in state held by this tab.
          if (getBrowserSessionSnapshot().signedIn) {
            setSessionState("signed-in");
            router.replace("/workspace");
          } else {
            setSessionState("error");
          }
        });
    }

    void readStatus(controller.signal)
      .then(status => {
        if (mounted) {
          setStatusState({ kind: "ready", status });
        }
      })
      .catch(error => {
        if (mounted && (error as { name?: string }).name !== "AbortError") {
          setStatusState({ kind: "error" });
        }
      });

    if (params.get("error") === "oauth" && mounted) {
      setOauthReturned(true);
    }

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [router]);

  const configured =
    statusState.kind === "ready" && statusState.status.configured === true;

  async function signInWithGitHub() {
    if (!configured || signingIn || sessionState !== "signed-out") return;

    setAuthError(null);
    setSigningIn(true);

    try {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/workspace",
        errorCallbackURL: "/login?error=oauth",
      });

      if (result.error) {
        throw new Error("oauth-request-failed");
      }
    } catch {
      setAuthError("GitHub sign-in did not start. Please try again.");
      setSigningIn(false);
    }
  }

  const missingConfiguration =
    statusState.kind === "ready" ? statusState.status.missingConfiguration : [];

  return (
    <main className={`auth-page ${styles.page}`}>
      <header className="auth-topbar">
        <Brand />
        <Link href="/" className="auth-back-link">
          <ArrowLeft size={14} />
          กลับไป ai-sdk.pro
        </Link>
      </header>

      <div className="auth-stage">
        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-card-mark" aria-hidden="true">
            <Github size={25} strokeWidth={1.8} />
          </div>
          <span className="auth-eyebrow">พื้นที่จัดการ REPOSITORY</span>
          <h1 id="login-title">เข้าสู่ระบบพื้นที่ทำงาน</h1>
          <p className="auth-intro">
            เชื่อมต่อ GitHub เพื่อดู repository ที่คุณอนุญาตและบันทึก snapshot
            แบบอ่านอย่างเดียวซึ่งมีขอบเขตจำกัด ระบบนี้ไม่ clone, build, run หรือ deploy โค้ด
          </p>

          {oauthReturned && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={16} />
              <span>เข้าสู่ระบบ GitHub ไม่สำเร็จ คุณสามารถลองอีกครั้งได้</span>
            </div>
          )}
          {expiredNotice && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={16} />
              <span>
                เซสชันหมดอายุหลังไม่มีการใช้งาน 3 ชั่วโมง กรุณาเข้าสู่ระบบอีกครั้ง
              </span>
            </div>
          )}
          {authError && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            className="auth-github-button"
            onClick={signInWithGitHub}
            disabled={!configured || signingIn || sessionState !== "signed-out"}
          >
            {signingIn ? (
              <LoaderCircle className="auth-spin" size={17} />
            ) : (
              <Github size={17} />
            )}
          {signingIn ? "กำลังเชื่อมต่อ GitHub…" : "ดำเนินการต่อด้วย GitHub"}
          </button>

          {statusState.kind === "loading" && (
            <p className="auth-status auth-status-loading" role="status">
              <LoaderCircle className="auth-spin" size={13} />
              กำลังตรวจสอบความพร้อมสำหรับเข้าสู่ระบบ…
            </p>
          )}
          {statusState.kind === "error" && (
            <p className="auth-status auth-status-error" role="status">
              <AlertCircle size={13} />
              ตรวจสอบการตั้งค่าการเข้าสู่ระบบไม่ได้ กรุณาลองใหม่ภายหลัง
            </p>
          )}
          {sessionState === "loading" && (
            <p className="auth-status auth-status-loading" role="status">
              <LoaderCircle className="auth-spin" size={13} />
              กำลังตรวจสอบเซสชันปัจจุบัน…
            </p>
          )}
          {sessionState === "error" && (
            <p className="auth-status auth-status-error" role="status">
              <AlertCircle size={13} />
              ตรวจสอบเซสชันไม่ได้ กรุณาลองใหม่ก่อนเข้าสู่ระบบ
            </p>
          )}
          {statusState.kind === "ready" && !statusState.status.configured && (
            <div className="auth-setup-note" role="status">
              <AlertCircle size={15} />
              <div>
                <strong>การตั้งค่าเข้าสู่ระบบ GitHub ยังไม่เสร็จ</strong>
                <p>
                  เจ้าของแอปต้องตั้งค่า GitHub และ Neon ให้เสร็จก่อนเปิดใช้การเข้าสู่ระบบ
                </p>
                {missingConfiguration.length > 0 && (
                  <ul>
                    {missingConfiguration.map(name => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="auth-trust-row">
            <ShieldCheck size={15} />
            <span>
              ยืนยันตัวตนผ่าน GitHub OAuth โดยไม่แสดง access token หรือค่าการเชื่อมต่อฐานข้อมูลในเบราว์เซอร์
            </span>
          </div>
          <p className="auth-privacy">
            พื้นที่ทำงานเป็นแบบอ่านอย่างเดียวและจำกัดเฉพาะ repository ที่เลือกผ่าน GitHub App
            snapshot มีขีดจำกัดจำนวนไฟล์และขนาดข้อมูล และแยกจาก BYOK chat
          </p>
        </section>
      </div>
    </main>
  );
}
