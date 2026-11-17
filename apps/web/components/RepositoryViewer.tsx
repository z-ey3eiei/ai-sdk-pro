"use client";

import Link from "next/link";
import RegistryDeployment from "./RegistryDeployment";
import PreviewDeployment from "./PreviewDeployment";
import {
  ArrowLeft,
  CircleAlert,
  FileCode2,
  GitBranch,
  Github,
  Library,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "@aisdkpro/ui";
import type {
  RepositoryDetail,
  RepositoryFile,
} from "../lib/platform-types";
import {
  presentRepositoryRequestError,
  RepositoryRequestError,
  type RepositoryRequestErrorPresentation,
} from "../lib/repository-request-error";

type DetailState =
  | { kind: "loading" }
  | { kind: "ready"; detail: RepositoryDetail }
  | { kind: "error"; error: RepositoryRequestErrorPresentation };

type WorkspaceTab = "overview" | "files" | "deployments" | "activity";

type FileState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; file: RepositoryFile }
  | { kind: "error"; error: RepositoryRequestErrorPresentation };

async function requestJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new RepositoryRequestError(response.status);
  return (await response.json()) as T;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function LanguagePill({ language }: { language: string | null }) {
  if (!language) return null;
  return <span className="repository-viewer-language">{language}</span>;
}

export default function RepositoryViewer({ repositoryId }: { repositoryId: string }) {
  const [detailState, setDetailState] = useState<DetailState>({ kind: "loading" });
  const [fileState, setFileState] = useState<FileState>({ kind: "idle" });
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    setDetailState({ kind: "loading" });
    setFileState({ kind: "idle" });
    setSelectedPath(null);
    setCopyState("idle");

    void requestJson<RepositoryDetail>(
      `/api/repositories/${encodeURIComponent(repositoryId)}`,
      controller.signal
    )
      .then(detail => {
        if (!mounted) return;
        setDetailState({ kind: "ready", detail });
        setSelectedPath(detail.files[0]?.path || null);
      })
      .catch(error => {
        if (!mounted || (error as { name?: string }).name === "AbortError") return;
        setDetailState({ kind: "error", error: presentRepositoryRequestError(error) });
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [repositoryId, refreshKey]);

  useEffect(() => {
    if (!selectedPath) {
      setFileState({ kind: "idle" });
      return;
    }

    const controller = new AbortController();
    let mounted = true;
    setFileState({ kind: "loading" });

    const encodedRepositoryId = encodeURIComponent(repositoryId);
    const encodedPath = encodeURIComponent(selectedPath);
    void requestJson<RepositoryFile>(
      `/api/repositories/${encodedRepositoryId}/files?path=${encodedPath}`,
      controller.signal
    )
      .then(file => {
        if (mounted) setFileState({ kind: "ready", file });
      })
      .catch(error => {
        if (!mounted || (error as { name?: string }).name === "AbortError") return;
        setFileState({ kind: "error", error: presentRepositoryRequestError(error) });
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [repositoryId, selectedPath]);

  const detail = detailState.kind === "ready" ? detailState.detail : null;
  const selectedSummary = useMemo(
    () => detail?.files.find(file => file.path === selectedPath) || null,
    [detail, selectedPath]
  );

  return (
    <main className="repository-viewer-page">
      <header className="repository-viewer-topbar">
        <div className="repository-viewer-topbar-inner">
          <Brand />
          <div className="repository-viewer-topbar-links">
            <nav className="repository-viewer-context-links" aria-label="Platform navigation">
              <Link href="/workspace" aria-current="page">Workspace</Link>
              <Link href="/chat">Chat</Link>
              <Link href="/templates">Templates</Link>
              <Link href="/docs/getting-started">Docs</Link>
            </nav>
          </div>
        </div>
      </header>

      {detailState.kind === "loading" && (
        <section className="repository-viewer-state">
          <LoaderCircle className="repository-viewer-spin" size={24} />
          <h1>Loading repository snapshot</h1>
          <p>Fetching current metadata and the pinned file list.</p>
        </section>
      )}

      {detailState.kind === "error" && (
        <section className="repository-viewer-state">
          <CircleAlert size={24} />
          <h1>{detailState.error.title}</h1>
          <p>{detailState.error.message}</p>
          <div className="repository-viewer-state-actions">
            <button
              type="button"
              className="repository-viewer-button repository-viewer-button-secondary"
              onClick={() => setRefreshKey(value => value + 1)}
            >
              <RefreshCw size={14} /> Try again
            </button>
            {detailState.error.kind === "signed-out" && (
              <Link
                href="/login"
                className="repository-viewer-button repository-viewer-button-primary"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>
      )}

      {detail && (
        <>
          <section className="repository-viewer-header">
            <Link href="/deploy" className="button secondary">
              Cloudflare Deploy
            </Link>

            <div className="repository-viewer-heading-row">
              <div className="repository-viewer-title-block">
                <span className="repository-viewer-eyebrow">IMPORTED SNAPSHOT</span>
                <h1>{detail.repository.fullName}</h1>
                <p>
                  {detail.repository.description || "No repository description provided."}
                </p>
              </div>
              <div className="repository-viewer-header-actions">
                <a
                  href={detail.repository.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="repository-viewer-button repository-viewer-button-secondary"
                >
                  <Github size={14} /> Open on GitHub
                </a>
                <Link
                  href="/workspace"
                  className="repository-viewer-button repository-viewer-button-primary"
                >
                  <Library size={14} /> All repositories
                </Link>
              </div>
            </div>
            <div className="repository-viewer-meta-grid">
              <div>
                <span>Visibility</span>
                <strong>
                  {detail.repository.private ? <LockKeyhole size={13} /> : <Github size={13} />}
                  {detail.repository.private ? "Private" : "Public"}
                </strong>
              </div>
              <div>
                <span>Default branch</span>
                <strong>
                  <GitBranch size={13} /> {detail.repository.defaultBranch}
                </strong>
              </div>
              <div>
                <span>Pinned commit SHA</span>
                <strong className="repository-viewer-commit">
                  {detail.repository.commitSha || "Unavailable"}
                </strong>
              </div>
              <div>
                <span>Imported</span>
                <strong>{formatDate(detail.repository.importedAt)}</strong>
              </div>
            </div>
          </section>

          <nav className="repository-viewer-tabs" aria-label="Repository sections" role="tablist">
            {([
              ["overview", "Overview"],
              ["files", "Files & Code"],
              ["deployments", "Deployments & Registry"],
              ["activity", "Activity & Settings"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            ))}
          </nav>

          {activeTab === "overview" && <section className="repository-viewer-scope-note">
            <ShieldCheck size={16} />
            <p>
              This view is a server-persisted, read-only snapshot: up to {detail.snapshotLimits.maxFiles} files,
              {" "}{formatBytes(detail.snapshotLimits.maxFileBytes)} per file, and {formatBytes(detail.snapshotLimits.maxTotalBytes)} total.
              {" "}{detail.repository.skippedFiles} files were skipped during import; binaries, dependencies, and sensitive paths are not shown.
            </p>
            {detail.repository.snapshotTruncated && <span>Snapshot cap reached</span>}
          </section>}

          {activeTab === "overview" && (
            <section className="repository-viewer-overview-actions">
              <p>Agent Registry and preview readiness must be checked before deployment. Imported source is never executed in the web container.</p>
              <button type="button" className="repository-viewer-button repository-viewer-button-primary" onClick={() => setActiveTab("deployments")}>
                Review deployment options
              </button>
            </section>
          )}

          {activeTab === "deployments" && (
            <section className="repository-viewer-deployment-tab" aria-label="Repository deployment">
              <h2>Deployments & Registry</h2>
              <p>Current integration triggers a GitHub Actions production deployment. Preview dispatch is not enabled; review the target before clicking Deploy.</p>
              <PreviewDeployment repositoryId={repositoryId} />
              <h3>Legacy production workflow</h3>
              <RegistryDeployment key={repositoryId} repositoryId={repositoryId} />
            </section>
          )}

          {activeTab === "activity" && (
            <section className="repository-viewer-activity-tab" aria-label="Workspace activity and settings">
              <h2>Activity & Settings</h2>
              <p>For security, the workspace login session expires after 3 hours of inactivity. Repository snapshots stay protected by per-user authorization.</p>
              <Link href="/workspace/tokens" className="repository-viewer-button repository-viewer-button-secondary">
                Manage platform API tokens
              </Link>
              <p>Deployment history will appear here once the event timeline endpoint is connected. No activity is fabricated.</p>
            </section>
          )}

          {activeTab === "files" && <section className="repository-viewer-workbench" aria-label="Repository source viewer">
            <aside className="repository-viewer-files">
              <div className="repository-viewer-files-heading">
                <div>
                  <span className="repository-viewer-eyebrow">SOURCE FILES</span>
                  <h2>{detail.files.length} included</h2>
                </div>
                <FileCode2 size={17} />
              </div>
              {detail.files.length > 0 ? (
                <div className="repository-viewer-file-list" role="listbox" aria-label="Snapshot files">
                  {detail.files.map(file => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={file.path === selectedPath}
                      className={file.path === selectedPath ? "active" : ""}
                      key={file.path}
                      onClick={() => setSelectedPath(file.path)}
                    >
                      <FileCode2 size={14} />
                      <span className="repository-viewer-file-name">{file.path}</span>
                      <span className="repository-viewer-file-bytes">{formatBytes(file.bytes)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="repository-viewer-empty-files">
                  <p>No text files were included in this snapshot.</p>
                </div>
              )}
            </aside>

            <div className="repository-viewer-code-pane">
              <div className="repository-viewer-code-heading">
                <div>
                  <span className="repository-viewer-code-path">
                    {selectedPath || "No file selected"}
                  </span>
                  <span className="repository-viewer-code-subtitle">
                    {selectedSummary ? `${formatBytes(selectedSummary.bytes)} · pinned snapshot` : "Select a file to inspect its text"}
                  </span>
                </div>
                <LanguagePill language={selectedSummary?.language || null} />
              </div>
              {fileState.kind === "loading" && (
                <div className="repository-viewer-code-state">
                  <LoaderCircle className="repository-viewer-spin" size={20} />
                  <span>Loading file contents…</span>
                </div>
              )}
              {fileState.kind === "error" && (
                <div className="repository-viewer-code-state repository-viewer-code-error">
                  <CircleAlert size={20} />
                  <span>{fileState.error.message}</span>
                  {fileState.error.kind === "signed-out" && (
                    <Link
                      href="/login"
                      className="repository-viewer-button repository-viewer-button-primary"
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              )}
              {fileState.kind === "idle" && (
                <div className="repository-viewer-code-state">
                  <FileCode2 size={20} />
                  <span>Select a text file from the snapshot.</span>
                </div>
              )}
              {fileState.kind === "ready" && (
                <>
                  <div className="repository-viewer-copy-row">
                    <span>Read-only pinned source · sensitive and SSH private-key paths excluded during import</span>
                    <button
                      type="button"
                      className="repository-viewer-button repository-viewer-button-secondary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(fileState.file.content);
                          setCopyState("copied");
                        } catch {
                          setCopyState("failed");
                        }
                      }}
                    >
                      Copy code
                    </button>
                    <span role="status">{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy unavailable" : ""}</span>
                  </div>
                  <pre className="repository-viewer-code"><code>{fileState.file.content}</code></pre>
                </>
              )}
            </div>
          </section>}
        </>
      )}
    </main>
  );
}
