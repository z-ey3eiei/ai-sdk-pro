
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Download, HardDrive, LoaderCircle, RefreshCw, Upload } from "lucide-react";
import WorkspaceChrome from "./WorkspaceChrome";
import { authClient } from "../lib/auth-client";
import type { PlatformSession } from "../lib/platform-types";

type StoredFile = { pathname: string; name: string; size: number; uploadedAt: string };
type Listing = { files: StoredFile[]; hasMore: boolean };
type Mode = "loading" | "signed-out" | "ready" | "disabled" | "error";

async function readResult<T>(response: Response): Promise<T> {
  const json = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(json.error || "Request failed.");
  return json;
}

export default function WorkspaceStorage() {
  const [session, setSession] = useState<PlatformSession>({ user: null });
  const [mode, setMode] = useState<Mode>("loading");
  const [items, setItems] = useState<StoredFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/storage/blobs", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 503) {
      setMode("disabled");
      setMessage("Vercel Blob is installed but private storage is not enabled on this server.");
      return;
    }
    const result = await readResult<Listing>(response);
    setItems(result.files);
    setMode("ready");
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/platform/session", { cache: "no-store", credentials: "same-origin" });
        const next = await readResult<PlatformSession>(response);
        if (!active) return;
        setSession(next);
        if (!next.user) { setMode("signed-out"); return; }
        await refresh();
      } catch {
        if (active) { setMode("error"); setMessage("Could not load private files."); }
      }
    })();
    return () => { active = false; };
  }, [refresh]);

  async function upload() {
    if (!selectedFile || busy || mode !== "ready") return;
    if (selectedFile.size > 4 * 1024 * 1024 || selectedFile.size === 0) {
      setMessage("File must be between 1 byte and 4 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const filename = selectedFile.name.replace(/[^\x20-\x7E]/g, "_");
      const result = await fetch("/api/storage/blobs", {
        method: "POST",
        body: selectedFile,
        credentials: "same-origin",
        headers: { "Content-Type": selectedFile.type, "X-File-Name": filename },
      });
      await readResult<{ file: StoredFile }>(result);
      setSelectedFile(null);
      await refresh();
      setMessage("File uploaded to your private Blob storage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setLogoutPending(true);
    try { await authClient.signOut(); window.location.assign("/login"); }
    catch { setLogoutPending(false); setMessage("Sign out failed."); }
  }

  return <WorkspaceChrome user={session.user} onLogout={() => { void logout(); }} logoutPending={logoutPending}>
    <section className="workspace-storage">
      <div className="workspace-storage-top">
        <div>
          <span className="workspace-storage-label">WORKSPACE / STORAGE</span>
          <h1><HardDrive size={28} /> Private Blob Storage</h1>
          <p>Vercel Blob for your private uploads. Cloudflare R2 continues to hold deployment artifacts.</p>
        </div>
        <button type="button" className="workspace-button workspace-button-secondary"
          onClick={() => { void refresh().catch(() => setMessage("Refresh failed.")); }} disabled={!session.user}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      {mode === "loading" && <p role="status"><LoaderCircle className="workspace-spin" size={16} /> Loading storage…</p>}
      {mode === "signed-out" && <p>Sign in with GitHub to access your private files. <Link href="/login">Sign in</Link></p>}
      {mode === "disabled" && <div className="workspace-storage-alert" role="status">
        <h2>Storage not activated</h2>
        <p>The SDK is integrated. A private Vercel Blob store, server-side token and rollout flag are required before uploads can be enabled.</p>
      </div>}
      {mode === "error" && <p role="alert">{message}</p>}
      {mode === "ready" && <>
        <section className="workspace-storage-panel">
          <h2>Upload a private file</h2>
          <p>PNG, JPEG, WebP or PDF. Maximum 4 MB. Files are not publicly accessible.</p>
          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={event => setSelectedFile(event.target.files?.[0] || null)} />
          <button type="button" className="workspace-button workspace-button-primary"
            disabled={!selectedFile || busy} onClick={() => { void upload(); }}>
            <Upload size={15} /> {busy ? "Uploading…" : "Upload file"}
          </button>
        </section>
        <section className="workspace-storage-panel">
          <h2>Your files</h2>
          {items.length === 0 && <p>No files uploaded yet.</p>}
          {items.map(file => <div className="workspace-storage-file" key={file.pathname}>
            <div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></div>
            <a className="workspace-button workspace-button-secondary"
              href={"/api/storage/blobs/download?pathname=" + encodeURIComponent(file.pathname)}>
              <Download size={15} /> Download
            </a>
          </div>)}
        </section>
      </>}
      {message && mode !== "error" && <p role="status">{message}</p>}
    </section>
  </WorkspaceChrome>;
}
