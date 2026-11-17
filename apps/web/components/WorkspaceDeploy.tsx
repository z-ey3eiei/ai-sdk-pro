"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Cloud, GitBranch, Github, LoaderCircle, RefreshCw, Rocket, ShieldCheck } from "lucide-react";
import { authClient } from "../lib/auth-client";
import type { GitHubRepository, GitHubRepositoryList, PlatformSession, PlatformStatus } from "../lib/platform-types";
import type { DeploymentEntry, DeploymentProject, ProjectList } from "../lib/deploy-bridge";
import WorkspaceChrome from "./WorkspaceChrome";

type Phase = "loading" | "signed-out" | "setup" | "ready" | "error";
type State = ProjectList | null;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin", cache: "no-store", ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (!response.ok) {
    let text = "Request failed (HTTP " + response.status + ").";
    try {
      const body = await response.json() as {error?: unknown};
      if (typeof body.error === "string" && body.error.length < 180) text = body.error;
    } catch { /* keep status */ }
    throw new Error(text);
  }
  return response.json() as Promise<T>;
}

function slugOf(repo: string) {
  return repo.split("/").at(-1)?.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "";
}

function isSafeUrl(url: string | null) {
  try {
    const parsed = new URL(url || "");
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".ai-sdk.pro");
  } catch { return false; }
}

export default function WorkspaceDeploy() {
  const searchParams = useSearchParams();
  const hintedRepo = searchParams.get("repo");
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<PlatformSession>({ user: null });
  const [backend, setBackend] = useState<State>(null);
  const [backendError, setBackendError] = useState("");
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [projectName, setProjectName] = useState("");
  const [framework, setFramework] = useState("auto");
  const [outputDir, setOutputDir] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [history, setHistory] = useState<DeploymentEntry[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setPhase("loading");
      setError("");
      try {
        const [status, current] = await Promise.all([
          requestJson<PlatformStatus>("/api/platform/status", { signal: controller.signal }),
          requestJson<PlatformSession>("/api/platform/session", { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setSession(current);
        if (!status.configured) { setPhase("setup"); return; }
        if (!current.user) { setPhase("signed-out"); return; }
        const [repoResult, control] = await Promise.allSettled([
          requestJson<GitHubRepositoryList>("/api/github/repositories", { signal: controller.signal }),
          requestJson<ProjectList>("/api/deploy/projects", { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        if (repoResult.status === "fulfilled") {
          setRepositories(repoResult.value.repositories);
          setInstallUrl(repoResult.value.installUrl);
          setSelectedRepo(previous => previous || repoResult.value.repositories.find(item => item.fullName === hintedRepo)?.fullName || repoResult.value.repositories[0]?.fullName || "");
        } else {
          setError("Could not load the GitHub App repositories for this account.");
        }
        if (control.status === "fulfilled") {
          setBackend(control.value);
          setBackendError("");
        } else {
          setBackend(null);
          setBackendError(control.reason instanceof Error ? control.reason.message : "Deployment backend unavailable.");
        }
        setPhase("ready");
      } catch {
        if (!controller.signal.aborted) setPhase("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [version]);

  const repo = useMemo(() => repositories.find(r => r.fullName === selectedRepo), [repositories, selectedRepo]);
  const project = useMemo(() => backend?.projects.find(p => p.id === selectedProject), [backend, selectedProject]);
  const canDeploy = Boolean(backend?.routingReady && project &&
    (backend.frameworkBuilds || project.framework === "static"));

  async function importProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!repo || !backend || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestJson<{project:{id:string;hostname:string}}>("/api/deploy/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName || slugOf(repo.fullName),
          repository: repo.fullName,
          installationId: repo.installationId,
          framework,
          ...(outputDir.trim() ? {outputDir: outputDir.trim()} : {}),
        }),
      });
      setSelectedProject(result.project.id);
      setNotice("Project registered on the existing Cloudflare control plane. Build is not queued automatically.");
      setVersion(x => x + 1);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Project could not be registered."); }
    finally { setBusy(false); }
  }

  async function selectProject(id: string) {
    setSelectedProject(id); setHistory([]); setError("");
    if (!id) return;
    try {
      const result = await requestJson<{deployments:DeploymentEntry[]}>(
        "/api/deploy/projects/" + encodeURIComponent(id) + "/deployments");
      setHistory(result.deployments);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load deployments."); }
  }

  async function deploy() {
    if (!project || !canDeploy || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestJson<{queued:boolean}>(
        "/api/deploy/projects/" + encodeURIComponent(project.id) + "/deployments", { method: "POST" });
      setNotice(result.queued ? "Deployment was queued. Check live history for the result." : "This commit has already been queued.");
      await selectProject(project.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Deploy could not be queued."); }
    finally { setBusy(false); }
  }

  async function logout() {
    setLogoutPending(true);
    try { await authClient.signOut(); window.location.assign("/login"); }
    catch { setLogoutPending(false); setError("Could not sign out."); }
  }

  return (
    <WorkspaceChrome user={session.user} onLogout={() => { void logout(); }} logoutPending={logoutPending}>
      <div className="unified-deploy">
        <div className="unified-deploy-head">
          <div>
            <span className="workspace-section-kicker">WORKSPACE / DEPLOY</span>
            <h1>Deploy โปรเจกต์</h1>
            <p>GitHub → Import → Build → Preview → Publish ผ่านบัญชีเดียวกับ ai-sdk.pro</p>
          </div>
          <button type="button" className="workspace-button workspace-button-secondary"
            onClick={() => setVersion(x => x + 1)}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        {phase === "loading" && <p role="status"><LoaderCircle size={16} className="workspace-spin" /> กำลังตรวจสอบ Session และ Deploy Backend…</p>}
        {phase === "signed-out" && <div className="unified-deploy-notice"><h2>เข้าสู่ระบบก่อนใช้งาน</h2>
          <p>ใช้ GitHub Login ของ ai-sdk.pro เพียงจุดเดียว</p><Link href="/login" className="workspace-button workspace-button-primary">Sign in</Link></div>}
        {phase === "setup" && <p role="alert">ระบบบัญชี Workspace ยังตั้งค่าไม่ครบ</p>}
        {phase === "error" && <p role="alert">ไม่สามารถตรวจสอบ Workspace ได้ กรุณาลอง Refresh</p>}
        {phase === "ready" && <>
          <div className="unified-deploy-state">
            <span><ShieldCheck size={15} /> GitHub signed in</span>
            <span><Cloud size={15} /> Cloudflare control plane: {backend ? "Connected" : "Not activated"}</span>
            <span><Rocket size={15} /> Project routing: {backend?.routingReady ? "Ready" : "Not enabled"}</span>
          </div>
          {backendError && <p className="unified-deploy-warning" role="alert">{backendError} ไม่ได้เปิดหน้า Login หรือ Dashboard ที่แยกโดเมน</p>}
          {notice && <p className="unified-deploy-success" role="status">{notice}</p>}
          {error && <p className="unified-deploy-warning" role="alert">{error}</p>}
          <div className="unified-deploy-grid">
            <section className="unified-deploy-card">
              <div className="unified-deploy-step">01 · GITHUB REPOSITORY</div>
              <h2>นำเข้าโปรเจ็กต์</h2>
              <p>เลือก Repository จาก GitHub App ที่ผูกกับบัญชีนี้</p>
              <form onSubmit={event => { void importProject(event); }}>
                <label htmlFor="deploy-repo">Repository</label>
                <select id="deploy-repo" value={selectedRepo} onChange={event => {
                  setSelectedRepo(event.target.value);
                  setProjectName(slugOf(event.target.value));
                }} disabled={!repositories.length || busy}>
                  {repositories.map(item => <option key={item.id} value={item.fullName}>{item.fullName}</option>)}
                </select>
                <label htmlFor="deploy-name">ชื่อโปรเจ็กต์ / Subdomain</label>
                <input id="deploy-name" value={projectName} onChange={event => setProjectName(event.target.value.toLowerCase())}
                  placeholder={slugOf(selectedRepo)} maxLength={40} required />
                <label htmlFor="deploy-framework">Framework</label>
                <select id="deploy-framework" value={framework} onChange={event => setFramework(event.target.value)}>
                  <option value="auto">Auto detect</option><option value="static">Static HTML</option>
                  <option value="astro">Astro static</option><option value="nextjs">Next.js static export</option>
                </select>
                <label htmlFor="deploy-output">Output folder (optional)</label>
                <input id="deploy-output" value={outputDir} onChange={event => setOutputDir(event.target.value)}
                  placeholder="public / dist / out" maxLength={96} />
                <div className="unified-deploy-actions">
                  <button className="workspace-button workspace-button-primary" type="submit"
                    disabled={!backend || !repo || busy}>{busy ? "Processing…" : "Register Project"}</button>
                  {installUrl && <a target="_blank" rel="noreferrer" href={installUrl}>Manage GitHub App <ArrowUpRight size={13} /></a>}
                </div>
              </form>
            </section>
            <section className="unified-deploy-card">
              <div className="unified-deploy-step">02 · BUILD & PUBLISH</div>
              <h2>โปรเจ็กต์ของฉัน</h2>
              <p>แสดงโปรเจ็กต์จาก Cloudflare Control Plane เดิม ไม่สร้างรายการจำลอง</p>
              {!backend && <p>Control Plane ยังไม่ได้เชื่อมกับ Workspace</p>}
              {backend && backend.projects.length === 0 && <p>ยังไม่มีโปรเจ็กต์ที่ลงทะเบียน</p>}
              {backend?.projects.map(item => (
                <button type="button" className={"unified-deploy-project" + (selectedProject === item.id ? " selected" : "")}
                  key={item.id} onClick={() => { void selectProject(item.id); }}>
                  <span><strong>{item.name}</strong><small><Github size={12} /> {item.repo_full_name}</small></span>
                  <GitBranch size={15} />
                </button>
              ))}
              {project && <div className="unified-deploy-project-details">
                <h3>{project.name}</h3>
                <p>Branch: <code>{project.branch}</code> · Framework: {project.framework}</p>
                <button type="button" className="workspace-button workspace-button-primary"
                  onClick={() => { void deploy(); }} disabled={!canDeploy || busy}>
                  <Rocket size={14} /> {busy ? "Processing…" : "Deploy selected branch"}
                </button>
                {!backend?.routingReady && <p className="unified-deploy-warning">ยังไม่เปิด DNS/Workers routing ของโปรเจ็กต์ จึงยังไม่รับคำสั่ง Deploy เพื่อไม่สร้าง Deploy ที่เปิด URL ไม่ได้</p>}
                {backend?.routingReady && !canDeploy && <p>Framework builds ยังไม่เปิด กรุณาใช้ Static HTML ที่รองรับใน Pilot</p>}
                <h3>Deployment history</h3>
                {history.length === 0 && <p>ไม่มี Deployment ที่บันทึกไว้</p>}
                {history.map(item => (
                  <div key={item.id} className="unified-deploy-history">
                    <code>{item.commit_sha.slice(0,8)}</code><span>{item.status}</span>
                    {item.status === "success" && isSafeUrl(item.url) && <a href={item.url!} target="_blank" rel="noreferrer">Open <ArrowUpRight size={13} /></a>}
                  </div>
                ))}
              </div>}
            </section>
          </div>
        </>}
      </div>
    </WorkspaceChrome>
  );
}
