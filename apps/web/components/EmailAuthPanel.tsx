
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { authClient } from "../lib/auth-client";
import "./native-auth.css";

type Mode = "sign-in" | "sign-up" | "forgot";

export default function EmailAuthPanel({
  enabled, initialMode = "sign-in",
}: {
  enabled: boolean;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setFormMode(next: Mode) {
    setMode(next);
    setMessage("");
    setError("");
    setPassword("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy) return;
    setBusy(true); setMessage(""); setError("");
    try {
      if (mode === "sign-up") {
        if (name.trim().length < 2 || password.length < 12 || password.length > 128) {
          setError("กรุณากรอกชื่อและรหัสผ่าน 12–128 ตัวอักษร");
          return;
        }
        const result = await authClient.signUp.email({
          name: name.trim(), email: email.trim().toLowerCase(),
          password, callbackURL: "/login?verified=1",
        });
        if (result.error) {
          // Do not reveal whether this email already exists.
          setError("ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูลและลองอีกครั้ง");
        } else {
          setMessage("หากอีเมลนี้สามารถสมัครได้ ระบบจะส่งลิงก์ยืนยันให้ กรุณาตรวจ Inbox และ Spam");
          setPassword("");
        }
        return;
      }
      if (mode === "forgot") {
        await authClient.requestPasswordReset({
          email: email.trim().toLowerCase(),
          redirectTo: "/reset-password",
        });
        setMessage("หากอีเมลนี้มีบัญชีและเปิดใช้รหัสผ่าน ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้");
        return;
      }
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        callbackURL: "/workspace",
        rememberMe: false,
      });
      if (result.error) {
        setError(result.error.status === 403
          ? "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
          : "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      window.location.assign("/workspace");
    } catch {
      setError("การเชื่อมต่อระบบบัญชีมีปัญหา กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!enabled || !email.trim() || busy) return;
    setBusy(true);setMessage("");setError("");
    try {
      await authClient.sendVerificationEmail({
        email: email.trim().toLowerCase(), callbackURL: "/login?verified=1",
      });
      setMessage("หากบัญชีต้องยืนยันอีเมล ระบบจะส่งลิงก์ใหม่ให้");
    } catch {
      setMessage("หากบัญชีต้องยืนยันอีเมล กรุณาลองอีกครั้งภายหลัง");
    } finally {setBusy(false);}
  }

  return (
    <div className="native-auth">
      <div className="native-auth-switch" role="tablist" aria-label="วิธีใช้บัญชี">
        <button type="button" role="tab" aria-selected={mode === "sign-in"}
          className={mode === "sign-in" ? "active" : ""} onClick={() => setFormMode("sign-in")}>
          เข้าสู่ระบบ
        </button>
        <button type="button" role="tab" aria-selected={mode === "sign-up"}
          className={mode === "sign-up" ? "active" : ""} onClick={() => setFormMode("sign-up")}>
          สมัครสมาชิก
        </button>
      </div>
      {enabled ? (
        <form className="native-auth-form" onSubmit={event => { void submit(event); }}>
          {mode === "sign-up" && <>
            <label htmlFor="auth-name">ชื่อที่แสดง</label>
            <input id="auth-name" value={name} autoComplete="name" required minLength={2} maxLength={80}
              onChange={event => setName(event.target.value)} placeholder="Your name" />
          </>}
          <label htmlFor="auth-email">อีเมล</label>
          <input id="auth-email" type="email" value={email} required autoComplete="email" maxLength={254}
            onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
          {mode !== "forgot" && <>
            <label htmlFor="auth-password">รหัสผ่าน</label>
            <input id="auth-password" type="password" required minLength={12} maxLength={128}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password} onChange={event => setPassword(event.target.value)}
              placeholder="อย่างน้อย 12 ตัวอักษร" />
          </>}
          {error && <p role="alert" className="native-auth-error">{error}</p>}
          {message && <p role="status" className="native-auth-success">{message}</p>}
          <button type="submit" className="native-auth-submit" disabled={busy}>
            {busy ? <LoaderCircle className="auth-spin" size={17} /> : <Mail size={17} />}
            {mode === "sign-up" ? "สร้างบัญชี ai-sdk.pro" :
              mode === "forgot" ? "ส่งลิงก์ตั้งรหัสผ่าน" : "เข้าสู่ระบบด้วยอีเมล"}
            <ArrowRight size={16} />
          </button>
          <div className="native-auth-foot">
            {mode === "forgot" ? (
              <button type="button" onClick={() => setFormMode("sign-in")}>กลับไปเข้าสู่ระบบ</button>
            ) : (
              <>
                <button type="button" onClick={() => setFormMode("forgot")}>ลืมรหัสผ่าน?</button>
                <button type="button" onClick={() => { void resend(); }}>ส่งอีเมลยืนยันอีกครั้ง</button>
              </>
            )}
          </div>
          {mode === "sign-up" && <p className="native-auth-hint"><ShieldCheck size={14} />
            สมัครด้วยอีเมลได้โดยไม่ต้องเชื่อม GitHub เมื่อยืนยันอีเมลแล้วจึงเชื่อม GitHub ใน Workspace ได้</p>}
        </form>
      ) : (
        <p className="native-auth-unavailable" role="status">
          การสมัครด้วยอีเมลกำลังเตรียมการส่งข้อความยืนยัน และจะเปิดเมื่อเซิร์ฟเวอร์ตั้งค่าระบบอีเมลแล้ว
        </p>
      )}
      <p className="native-auth-help">
        มีบัญชีเดิมจาก GitHub อยู่แล้ว? ให้ใช้ปุ่ม GitHub เดิมก่อน แล้วเปิดใช้รหัสผ่านที่
        {" "}<Link href="/workspace/account">Account Settings</Link> เพื่อใช้ User ID เดียวกัน
      </p>
    </div>
  );
}
