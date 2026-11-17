"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HardDrive, LoaderCircle, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { authClient } from "../lib/auth-client";
import type { PlatformSession } from "../lib/platform-types";
import WorkspaceChrome from "./WorkspaceChrome";

type PrivateFile = {
  pathname: string;
  size: number;
  uploadedAt: string;
  contentType: string;
};

type BlobList = { enabled: boolean; files: PrivateFile[]; hasMore: boolean };
const endpoint = "/api/storage/blob";
const maxBytes = 4_000_000;

function sizeLabel(bytes: number): string {
  return bytes < 1024 ? bytes + " B" : bytes < 1024 * 1024
    ? (bytes / 1024).toFixed(0) + " KiB"
    : (bytes / (1024 * 1024)).toFixed(2) + " MiB";
}

export default function WorkspaceBlobStorage() {
  const [session,setSession] = useState<PlatformSession>({user:null});
  const [loading,setLoading] = useState(true);
  const [configured,setConfigured] = useState(false);
  const [files,setFiles] = useState<PrivateFile[]>([]);
  const [selected,setSelected] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [signingOut,setSigningOut] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const sessionResponse = await fetch("/api/platform/session",{cache:"no-store"});
      const next = await sessionResponse.json() as PlatformSession;
      setSession(next);
      if (!next.user) return;
      const response = await fetch(endpoint,{cache:"no-store"});
      if (response.status === 503) { setConfigured(false); return; }
      if (!response.ok) throw new Error("Could not load your private files.");
      const data = await response.json() as BlobList;
      setConfigured(data.enabled); setFiles(data.files);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Storage could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function uploadFile(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !configured || busy) return;
    if (selected.size > maxBytes) { setError("File limit is 4 MB."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const body = new FormData();
      body.set("file",selected);
      const response = await fetch(endpoint,{method:"POST",body,credentials:"same-origin"});
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as {error?:string};
        throw new Error(data.error || "Upload failed.");
      }
      setSelected(null);
      setMessage("File uploaded to your private workspace.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally { setBusy(false); }
  }

  async function removeFile(pathname: string) {
    if (busy || !window.confirm("Delete this private file?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint,{
        method:"DELETE",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({pathname}),
      });
      if (!response.ok) throw new Error("Delete failed.");
      setMessage("File removed.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    setSigningOut(true);
    try { await authClient.signOut(); window.location.assign("/login"); }
    catch { setSigningOut(false); setError("Could not sign out."); }
  }

  return <WorkspaceChrome user={session.user} onLogout={() => { void signOut(); }}
    logoutPending={signingOut}>
    <section className="workspace-storage">
      <div className="workspace-storage-header">
        <div><span className="workspace-section-kicker">WORKSPACE / STORAGE</span>
          <h1>Private Storage</h1>
          <p>Vercel Blob สำหรับไฟล์ส่วนตัวของบัญชี ไม่ใช้เก็บ Build Artifacts หรือ Logs</p>
        </div>
        <button type="button" onClick={() => { void load(); }}
          className="workspace-button workspace-button-secondary" disabled={loading}>
          <RefreshCw size={15}/> Refresh
        </button>
      </div>
      {loading ? <p role="status"><LoaderCircle size={16}/> กำลังโหลดข้อมูล…</p>
      : !session.user ? <div className="workspace-storage-panel">
        <p>เข้าสู่ระบบด้วย GitHub เพื่อเข้าถึงไฟล์ส่วนตัว</p>
        <Link href="/login" className="workspace-button workspace-button-primary">Sign in</Link>
      </div>
      : !configured ? <div className="workspace-storage-panel">
        <HardDrive size={26} />
        <h2>Private Blob ยังไม่เปิดใช้งาน</h2>
        <p>ต้องเชื่อม Private Blob Store และตั้งค่าคีย์ฝั่งเซิร์ฟเวอร์ก่อน ไม่เปิดรับไฟล์จนกว่าจะพร้อม</p>
      </div>
      : <div className="workspace-storage-grid">
        <form className="workspace-storage-panel" onSubmit={event => { void uploadFile(event); }}>
          <h2>Upload a private file</h2>
          <p>JPEG, PNG, WebP หรือ PDF · ไม่เกิน 4 MB</p>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={event => setSelected(event.target.files?.[0] || null)} />
          <button type="submit" className="workspace-button workspace-button-primary"
            disabled={!selected || busy}><UploadCloud size={15}/> {busy ? "Uploading…" : "Upload"}</button>
        </form>
        <div className="workspace-storage-panel">
          <h2>My Files</h2>
          {!files.length && <p>ยังไม่มีไฟล์ที่บันทึก</p>}
          {files.map(file => <div className="workspace-storage-file" key={file.pathname}>
            <div><strong>{file.pathname.split("/").pop()}</strong>
              <small>{sizeLabel(file.size)} · {file.contentType}</small></div>
            <div className="workspace-storage-file-actions">
              <a href={endpoint + "?pathname=" + encodeURIComponent(file.pathname)}
                className="workspace-button workspace-button-secondary">Download</a>
              <button type="button" className="workspace-button workspace-button-secondary"
                aria-label="Delete file" disabled={busy} onClick={() => {void removeFile(file.pathname);}}>
                <Trash2 size={15}/></button>
            </div>
          </div>)}
        </div>
      </div>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert" className="workspace-storage-error">{error}</p>}
    </section>
  </WorkspaceChrome>;
}
