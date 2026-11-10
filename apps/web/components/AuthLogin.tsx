"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Github, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@aisdkpro/ui";
import { authClient } from "../lib/auth-client";
import type { PlatformStatus } from "../lib/platform-types";

type StatusState =
  | { kind: "loading" }
  | { kind: "ready"; status: PlatformStatus }
  | { kind: "error" };

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
  const [statusState, setStatusState] = useState<StatusState>({ kind: "loading" });
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [oauthReturned, setOauthReturned] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

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

    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth" && mounted) {
      setOauthReturned(true);
    }

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const configured =
    statusState.kind === "ready" && statusState.status.configured === true;

  async function signInWithGitHub() {
    if (!configured || signingIn) return;

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
          <h1 id="login-title">Sign in to your workspace.</h1>
          <p className="auth-intro">
            Connect GitHub to review selected repositories and save bounded,
            read-only snapshots. No repository code is built or deployed here.
          </p>

          {oauthReturned && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={16} />
              <span>GitHub sign-in was not completed. You can try again.</span>
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
            disabled={!configured || signingIn}
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
              Authentication uses GitHub OAuth. We do not show access tokens or
              database connection values in the browser.
            </span>
          </div>
          <p className="auth-privacy">
            Workspace access is read-only and scoped to repositories you select
            through the GitHub App. Imported snapshots have explicit file and
            byte limits and remain separate from the BYOK chat.
          </p>
        </section>
      </div>
    </main>
  );
}
