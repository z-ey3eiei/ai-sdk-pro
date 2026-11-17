
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Github, KeyRound, Link2, LoaderCircle, LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import WorkspaceChrome from "./WorkspaceChrome";
import { authClient } from "../lib/auth-client";
import type { PlatformSession, PlatformStatus } from "../lib/platform-types";

type AccountStatus = { github:boolean; password:boolean; emailVerified:boolean; email:string };
type Phase = "loading" | "signed-out" | "ready" | "error";

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {credentials:"same-origin",cache:"no-store",...init});
  if (!response.ok) throw new Error("Account API returned HTTP " + response.status);
  return response.json() as Promise<T>;
}

export default function WorkspaceAccount() {
  const [session, setSession] = useState<PlatformSession>({user:null});
  const [settings, setSettings] = useState<AccountStatus | null>(null);
  const [platform, setPlatform] = useState<PlatformStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [busy, setBusy] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [current, capabilities] = await Promise.all([
      json<PlatformSession>("/api/platform/session"),
      json<PlatformStatus>("/api/platform/status"),
    ]);
    setSession(current); setPlatform(capabilities);
    if (!current.user) { setPhase("signed-out"); return; }
    setSettings(await json<AccountStatus>("/api/platform/connected-accounts"));
    setPhase("ready");
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("linked") === "1") setNotice("GitHub connection returned. Checking linked account…");
    if (query.has("error")) setError("GitHub connection could not be completed. You may retry.");
    void refresh().catch(() => setPhase("error"));
  }, [refresh]);

  async function linkGithub() {
    if (busy || !platform?.githubConfigured) return;
    setBusy(true);setError("");setNotice("");
    try {
      const result = await authClient.linkSocial({
        provider: "github",
        callbackURL: "/workspace/account?linked=1",
      });
      if (result.error) throw new Error("Failed to begin GitHub linking.");
    } catch {
      setError("ไม่สามารถเริ่มเชื่อม GitHub ได้ กรุณาลองใหม่");
      setBusy(false);
    }
  }

  async function enablePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation || password.length < 12 || password.length > 128) {
      setError("กรุณากรอกรหัสผ่านเหมือนกันและยาว 12–128 ตัวอักษร");
      return;
    }
    setBusy(true);setError("");setNotice("");
    try {
      await json<{ok:boolean}>("/api/platform/enable-password", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({newPassword:password}),
      });
      setPassword("");setConfirmation("");
      await refresh();
      setNotice("เปิดใช้รหัสผ่านให้บัญชีเดิมแล้ว คุณสามารถเข้าสู่ระบบด้วยอีเมลได้");
    } catch {
      setError("ไม่สามารถเพิ่มรหัสผ่านได้ ตรวจสอบอีเมลที่ยืนยันแล้วและลองอีกครั้ง");
    } finally {setBusy(false);}
  }

  async function logout() {
    setLogoutPending(true);
    try {await authClient.signOut();window.location.assign("/login");}
    catch {setLogoutPending(false);setError("Sign out failed.");}
  }

  return <WorkspaceChrome user={session.user} onLogout={() => {void logout();}} logoutPending={logoutPending}>
    <section className="workspace-account-settings">
      <span className="workspace-account-kicker">WORKSPACE / ACCOUNT</span>
      <h1>บัญชีและการเชื่อมต่อ</h1>
      <p>สมัครและจัดการบัญชีบน ai-sdk.pro ได้โดยตรง ส่วน GitHub เป็นการเชื่อมเพิ่มเติมเมื่อใช้งาน Repository/Deploy</p>
      {phase === "loading" && <p role="status"><LoaderCircle className="workspace-spin" size={16}/> Loading account…</p>}
      {phase === "signed-out" && <p>กรุณา <Link href="/login">เข้าสู่ระบบ</Link> ก่อน</p>}
      {phase === "error" && <p role="alert">ไม่สามารถอ่านบัญชีได้ โปรดลองโหลดหน้าใหม่</p>}
      {notice && <p role="status" className="workspace-account-success">{notice}</p>}
      {error && <p role="alert" className="workspace-account-error">{error}</p>}
      {phase === "ready" && settings && <>
        <div className="workspace-account-card">
          <h2><ShieldCheck size={20}/> บัญชี ai-sdk.pro</h2>
          <p>{settings.email}</p>
          <div className="workspace-account-state">
            <span><MailCheck size={15}/> Email: {settings.emailVerified ? "Verified" : "Not verified"}</span>
            <span><LockKeyhole size={15}/> Password: {settings.password ? "Enabled" : "Not set"}</span>
          </div>
          {!settings.emailVerified && <p>ยืนยันอีเมลก่อนเพิ่มวิธีเข้าสู่ระบบหรือเชื่อมบัญชีอื่น</p>}
        </div>
        <div className="workspace-account-card">
          <h2><Github size={20}/> เชื่อมบัญชี GitHub</h2>
          <p>เชื่อม GitHub เข้ากับ User ID ปัจจุบัน โดยไม่สร้างบัญชีอีกชุด</p>
          <div className="workspace-account-state">
            <span><Link2 size={15}/> {settings.github ? "GitHub linked" : "GitHub not connected"}</span>
          </div>
          {!settings.github && <button type="button" className="workspace-button workspace-button-primary"
            disabled={busy || !platform?.githubConfigured || !settings.emailVerified}
            onClick={() => {void linkGithub();}}>
            <Github size={15}/> Connect GitHub
          </button>}
          {settings.github && <a className="workspace-button workspace-button-secondary"
            href={platform?.githubAppInstallUrl || "https://github.com/apps/ai-sdk-pro/installations/new"}
            target="_blank" rel="noreferrer">
            <Github size={15}/> Manage GitHub App installation
          </a>}
          <p className="workspace-account-help">
            {settings.github
              ? "GitHub OAuth เชื่อมแล้ว ติดตั้ง GitHub App เพื่อเลือก Repository ที่อนุญาต"
              : "GitHub ใช้สำหรับ Import, Preview และ Deploy เท่านั้น การเข้า Workspace ไม่ต้องใช้ GitHub"}
          </p>
        </div>
        {settings.github && !settings.password && platform?.emailRegistrationAvailable && settings.emailVerified && (
          <div className="workspace-account-card">
            <h2><KeyRound size={20}/> เพิ่มรหัสผ่านให้บัญชีเดิม</h2>
            <p>บัญชีที่เคยเข้าสู่ระบบด้วย GitHub สามารถเปิดใช้ Email Login โดยรักษา User ID และโปรเจ็กต์เดิมไว้</p>
            <form className="workspace-account-form" onSubmit={event=>{void enablePassword(event);}}>
              <label htmlFor="account-password">New password (12–128 characters)</label>
              <input id="account-password" type="password" required minLength={12} maxLength={128}
                autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/>
              <label htmlFor="account-confirm">Confirm password</label>
              <input id="account-confirm" type="password" required minLength={12} maxLength={128}
                autoComplete="new-password" value={confirmation} onChange={event=>setConfirmation(event.target.value)}/>
              <button className="workspace-button workspace-button-primary" type="submit" disabled={busy}>
                Enable email login
              </button>
            </form>
          </div>
        )}
      </>}
    </section>
  </WorkspaceChrome>;
}
