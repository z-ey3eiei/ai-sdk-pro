"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Github, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@aisdkpro/ui";
import EmailAuthPanel from "./EmailAuthPanel";
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

export default function AuthLogin({initialMode = "sign-in"}: {initialMode?: "sign-in" | "sign-up"}) {
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
    statusState.kind === "ready" && statusState.status.configured === true && statusState.status.githubConfigured !== false;
  const emailEnabled = statusState.kind === "ready" && statusState.status.emailRegistrationAvailable === true;

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
    <main className="auth-page">
      <header className="auth-topbar">
        <Brand />
        <Link href="/" className="auth-back-link">
          <ArrowLeft size={14} />
          Back to ai-sdk.pro
        </Link>
      </header>

      <div className="auth-stage">
        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-card-mark" aria-hidden="true">
            <Github size={25} strokeWidth={1.8} />
          </div>
          <span className="auth-eyebrow">REPOSITORY WORKSPACE</span>
          <h1 id="login-title">Your ai-sdk.pro account.</h1>
          <p className="auth-intro">
            Create an account using email and password. Connect GitHub later
            to import repositories and deploy projects, all in one workspace.
          </p>

          {oauthReturned && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={16} />
              <span>GitHub sign-in was not completed. You can try again.</span>
            </div>
          )}
          {expiredNotice && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={16} />
              <span>
                Your session expired after 3 hours of inactivity. Sign in again
                to continue.
              </span>
            </div>
          )}
          {authError && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <EmailAuthPanel enabled={emailEnabled} initialMode={initialMode} />
          <p className="native-auth-help" style={{textAlign:"center"}}>หรือเข้าสู่ระบบด้วย GitHub</p>
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
            {signingIn ? "Connecting to GitHub…" : "Continue with GitHub"}
          </button>

          {statusState.kind === "loading" && (
            <p className="auth-status auth-status-loading" role="status">
              <LoaderCircle className="auth-spin" size={13} />
              Checking sign-in availability…
            </p>
          )}
          {statusState.kind === "error" && (
            <p className="auth-status auth-status-error" role="status">
              <AlertCircle size={13} />
              Login setup could not be verified. Try again later.
            </p>
          )}
          {sessionState === "loading" && (
            <p className="auth-status auth-status-loading" role="status">
              <LoaderCircle className="auth-spin" size={13} />
              Checking your existing session…
            </p>
          )}
          {sessionState === "error" && (
            <p className="auth-status auth-status-error" role="status">
              <AlertCircle size={13} />
              Your session could not be verified. Try again before signing in.
            </p>
          )}
          {statusState.kind === "ready" && !statusState.status.configured && (
            <div className="auth-setup-note" role="status">
              <AlertCircle size={15} />
              <div>
                <strong>GitHub login setup is pending.</strong>
                <p>
                  The app owner must finish the GitHub and Neon configuration
                  before sign-in can be enabled.
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
              Authentication supports verified email accounts or GitHub OAuth.
              GitHub is connected explicitly after signing up; tokens remain server-side.
            </span>
          </div>
          <p className="auth-privacy">
            Accounts are stored in the existing Neon database. Access to GitHub
            repositories requires a separate connection and GitHub App installation.
          </p>
        </section>
      </div>
    </main>
  );
}
