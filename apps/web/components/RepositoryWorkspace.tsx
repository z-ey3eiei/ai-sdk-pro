"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  Download,
  ExternalLink,
  Github,
  Globe2,
  GitBranch,
  Library,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "../lib/auth-client";
import WorkspaceChrome from "./WorkspaceChrome";
import WorkspaceDeployPanel from "./WorkspaceDeployPanel";
import type {
  GitHubRepository,
  GitHubRepositoryList,
  ImportedRepository,
  PlatformSession,
  PlatformStatus,
} from "../lib/platform-types";
import {
  presentRepositoryRequestError,
  RepositoryRequestError,
} from "../lib/repository-request-error";

type Phase = "loading" | "ready" | "signed-out" | "setup" | "error";
type Tab = "imported" | "github" | "deploy";

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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="workspace-state-panel">
      <div className="workspace-state-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

function RepositoryPrivateBadge({ isPrivate }: { isPrivate: boolean }) {
  return (
    <span className="workspace-visibility-badge">
      {isPrivate ? <LockKeyhole size={12} /> : <Globe2 size={12} />}
      {isPrivate ? "Private" : "Public"}
    </span>
  );
}

function ImportedRepositoryCard({
  repository,
  onPublish,
}: {
  repository: ImportedRepository;
  onPublish: () => void;
}) {
  const repositoryUrl = `/workspace/repositories/${encodeURIComponent(repository.id)}`;
  return (
    <article className="workspace-repo-card-stack">
      <Link
        href={repositoryUrl}
        className="workspace-repo-card workspace-repo-card-imported"
      >
        <div className="workspace-repo-card-heading">
          <span className="workspace-repo-mark workspace-repo-mark-imported">
            <Library size={17} />
          </span>
          <span className="workspace-repo-card-title">
            <strong>{repository.fullName}</strong>
            <span>
              Imported {formatDate(repository.importedAt)}
            </span>
          </span>
          <ChevronRight className="workspace-card-arrow" size={17} />
        </div>
        <p className="workspace-repo-description">
          {repository.description || "No repository description provided."}
        </p>
        <div className="workspace-repo-meta">
          <RepositoryPrivateBadge isPrivate={repository.private} />
          <span>
            <GitBranch size={12} /> {repository.defaultBranch}
          </span>
          <span>
            <GitBranch size={12} /> {repository.importedFiles} files
          </span>
          <span>{formatBytes(repository.totalBytes)}</span>
        </div>
        <div className="workspace-repo-commit">
          <span>Pinned commit</span>
          <code>{repository.commitSha.slice(0, 12) || "Unavailable"}</code>
          {repository.snapshotTruncated && <span className="workspace-truncated">CAP REACHED</span>}
        </div>
      </Link>
      <div className="workspace-repo-secondary-actions">
        <button
          type="button"
          className="workspace-button workspace-button-primary"
          onClick={onPublish}
        >
          <Rocket size={14} /> เผยแพร่ (Deploy)
        </button>
        <Link href={repositoryUrl} className="workspace-button workspace-button-secondary">
          ดู snapshot <ChevronRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function GitHubRepositoryCard({
  repository,
  imported,
  importing,
  onImport,
  onPublish,
}: {
  repository: GitHubRepository;
  imported: boolean;
  importing: boolean;
  onImport: () => void;
  onPublish: () => void;
}) {
  return (
    <article className="workspace-repo-card workspace-repo-card-github">
      <div className="workspace-repo-card-heading">
        <span className="workspace-repo-mark workspace-repo-mark-github">
          <Github size={17} />
        </span>
        <span className="workspace-repo-card-title">
          <strong>{repository.fullName}</strong>
          <span>Updated {formatDate(repository.updatedAt)}</span>
        </span>
        <a
          className="workspace-card-external"
          href={repository.htmlUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${repository.fullName} on GitHub`}
          onClick={event => event.stopPropagation()}
        >
          <ExternalLink size={15} />
        </a>
      </div>
      <p className="workspace-repo-description">
        {repository.description || "No repository description provided."}
      </p>
      <div className="workspace-repo-meta">
        <RepositoryPrivateBadge isPrivate={repository.private} />
        <span>
          <GitBranch size={12} /> {repository.defaultBranch}
        </span>
        {repository.language && <span>{repository.language}</span>}
        <span>{repository.stargazersCount} stars</span>
      </div>
      <div className="workspace-repo-action-row">
        <span className="workspace-read-only-label">
          <ShieldCheck size={12} /> นำเข้าแล้วไป Deploy
        </span>
        {imported ? (
          <button
            type="button"
            className="workspace-button workspace-button-primary workspace-import-button"
            onClick={onPublish}
          >
            <Rocket size={14} /> ไป Deploy
          </button>
        ) : (
          <button
            type="button"
            className="workspace-button workspace-button-primary workspace-import-button"
            disabled={importing}
            onClick={onImport}
          >
            {importing ? (
              <LoaderCircle className="workspace-spin" size={14} />
            ) : (
              <>
                <Download size={14} /> นำเข้าแล้วไป Deploy
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

export default function RepositoryWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [session, setSession] = useState<PlatformSession>({ user: null });
  const [githubRepositories, setGithubRepositories] = useState<GitHubRepositoryList | null>(null);
  const [importedRepositories, setImportedRepositories] = useState<ImportedRepository[]>([]);
  const [tab, setTab] = useState<Tab>("imported");
  const [query, setQuery] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const deployRepoHint = searchParams.get("repo");

  useEffect(() => {
    if (searchParams.get("view") === "deploy") {
      setTab("deploy");
    }
  }, [searchParams]);

  function goToDeploy(fullName: string) {
    setTab("deploy");
    router.replace(
      `/workspace?view=deploy&repo=${encodeURIComponent(fullName)}`
    );
  }

  function openDeployTab() {
    setTab("deploy");
    const next = deployRepoHint
      ? `/workspace?view=deploy&repo=${encodeURIComponent(deployRepoHint)}`
      : "/workspace?view=deploy";
    router.replace(next);
  }

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

        const [nextGithubRepositories, nextImportedRepositories] = await Promise.all([
          requestJson<GitHubRepositoryList>("/api/github/repositories", controller.signal),
          requestJson<{ repositories: ImportedRepository[] }>(
            "/api/repositories",
            controller.signal
          ),
        ]);
        if (!mounted) return;

        setGithubRepositories(nextGithubRepositories);
        setImportedRepositories(nextImportedRepositories.repositories);
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

  const filteredImported = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return importedRepositories;
    return importedRepositories.filter(repository =>
      `${repository.fullName} ${repository.description || ""} ${repository.language || ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [importedRepositories, query]);

  const filteredGithub = useMemo(() => {
    const repositories = githubRepositories?.repositories || [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return repositories;
    return repositories.filter(repository =>
      `${repository.fullName} ${repository.description || ""} ${repository.language || ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [githubRepositories, query]);

  const githubInstallUrl =
    status?.githubAppInstallUrl || githubRepositories?.installUrl || null;

  async function handleImport(repository: GitHubRepository) {
    if (importingKey) return;
    setImportingKey(repository.fullName);
    setRequestError(null);

    const controller = new AbortController();
    try {
      const result = await requestJson<{ repository: ImportedRepository }>(
        "/api/repositories",
        controller.signal,
        {
          method: "POST",
          body: JSON.stringify({
            fullName: repository.fullName,
            installationId: repository.installationId,
          }),
        }
      );

      if (!result.repository) throw new RepositoryRequestError(500);
      setImportedRepositories(current => [
        result.repository,
        ...current.filter(item => item.id !== result.repository.id),
      ]);
      goToDeploy(repository.fullName);
    } catch (error) {
      const issue = presentRepositoryRequestError(error);
      setRequestError(issue.message);
      if (issue.kind === "signed-out") {
        setSession({ user: null });
        setPhase("signed-out");
      } else if (issue.kind === "setup") {
        setPhase("setup");
      }
    } finally {
      setImportingKey(null);
      controller.abort();
    }
  }

  async function handleLogout() {
    if (logoutPending) return;
    setLogoutPending(true);
    setRequestError(null);
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
    >
      {phase === "loading" && (
        <StatePanel
          icon={<LoaderCircle className="workspace-spin" size={22} />}
          title="Checking workspace access"
          description="Verifying your session and loading current repository data."
        />
      )}

      {phase === "error" && (
        <StatePanel
          icon={<CircleAlert size={22} />}
          title="Workspace unavailable"
          description={requestError || "The current repository data could not be loaded."}
          action={
            <button
              type="button"
              className="workspace-button workspace-button-secondary"
              onClick={() => setRefreshKey(value => value + 1)}
            >
              <RefreshCw size={14} /> Try again
            </button>
          }
        />
      )}

      {phase === "signed-out" && (
        <StatePanel
          icon={<Github size={22} />}
          title="Sign in to view repositories"
          description={
            requestError ||
            "There is no active session. Sign in with GitHub to access your authorized repository list."
          }
          action={
            <Link href="/login" className="workspace-button workspace-button-primary">
              Continue to login <ArrowUpRight size={14} />
            </Link>
          }
        />
      )}

      {phase === "setup" && (
        <StatePanel
          icon={<CircleAlert size={22} />}
          title="Workspace setup is pending"
          description={
            requestError ||
            "GitHub App or Neon configuration is not ready. No repository request was attempted."
          }
          action={
            <div className="workspace-setup-details">
              {status?.missingConfiguration?.length ? (
                <span>
                  Missing configuration labels: {status.missingConfiguration.join(", ")}
                </span>
              ) : (
                <span>The app owner needs to finish platform configuration.</span>
              )}
            </div>
          }
        />
      )}

      {phase === "ready" && status && githubRepositories && (
        <>
          <section className="workspace-hero">
            <div>
              <span className="workspace-eyebrow">IMPORT + PUBLISH</span>
              <h1>นำเข้า snapshot และเผยแพร่ใน Workspace เดียว</h1>
              <p>
                เลือก repo จาก GitHub → นำเข้า snapshot แบบ read-only เพื่อตรวจโค้ด →
                ระบบพาไปแท็บ Deploy เพื่อเผยแพร่จาก Git ชุดเดียวกัน
              </p>
            </div>
            <div className="workspace-limit-card">
              <span className="workspace-limit-card-title">
                <ShieldCheck size={14} /> Snapshot scope
              </span>
              <strong>
                {status.snapshotLimits.maxFiles} files · {formatBytes(status.snapshotLimits.maxTotalBytes)} total
              </strong>
              <span>
                {formatBytes(status.snapshotLimits.maxFileBytes)} maximum per file · binaries and sensitive paths skipped
              </span>
            </div>
          </section>

          {requestError && (
            <div className="workspace-inline-alert" role="alert">
              <CircleAlert size={15} />
              <span>{requestError}</span>
              <button type="button" onClick={() => setRequestError(null)} aria-label="Dismiss message">
                Dismiss
              </button>
            </div>
          )}

          <section className="workspace-toolbar" aria-label="Repository controls">
            <div className="workspace-tabs" role="tablist" aria-label="Repository source">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "imported"}
                className={tab === "imported" ? "active" : ""}
                onClick={() => setTab("imported")}
              >
                <Library size={14} /> Imported snapshots
                <span>{importedRepositories.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "github"}
                className={tab === "github" ? "active" : ""}
                onClick={() => setTab("github")}
              >
                <Github size={14} /> GitHub available
                <span>{githubRepositories.repositories.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "deploy"}
                className={tab === "deploy" ? "active" : ""}
                onClick={openDeployTab}
              >
                <Rocket size={14} /> เผยแพร่ (Deploy)
              </button>
            </div>
            <label className="workspace-search">
              <Search size={15} />
              <span className="sr-only">Search repositories</span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search repositories…"
                type="search"
              />
            </label>
            <button
              type="button"
              className="workspace-icon-button workspace-refresh-button"
              onClick={() => setRefreshKey(value => value + 1)}
              aria-label="Refresh repository data"
              title="Refresh repository data"
            >
              <RefreshCw size={15} />
            </button>
          </section>

          {tab === "deploy" ? (
            <section className="workspace-section" aria-labelledby="deploy-title">
              <div className="workspace-section-heading">
                <div>
                  <span className="workspace-eyebrow">CLOUDFLARE PILOT</span>
                  <h2 id="deploy-title">Deploy projects</h2>
                </div>
                {deployRepoHint ? (
                  <span className="workspace-section-count">{deployRepoHint}</span>
                ) : null}
              </div>
              <WorkspaceDeployPanel repoHint={deployRepoHint} />
            </section>
          ) : tab === "imported" ? (
            <section className="workspace-section" aria-labelledby="imported-title">
              <div className="workspace-section-heading">
                <div>
                  <span className="workspace-eyebrow">PERSISTED FOR THIS ACCOUNT</span>
                  <h2 id="imported-title">Imported snapshots</h2>
                </div>
                <span className="workspace-section-count">{filteredImported.length} shown</span>
              </div>
              {filteredImported.length > 0 ? (
                <div className="workspace-repo-grid">
                  {filteredImported.map(repository => (
                    <ImportedRepositoryCard
                      key={repository.id}
                      repository={repository}
                      onPublish={() => goToDeploy(repository.fullName)}
                    />
                  ))}
                </div>
              ) : (
                <StatePanel
                  icon={<Library size={20} />}
                  title={query ? "No matching snapshots" : "No imported snapshots yet"}
                  description={
                    query
                      ? "Try another repository name or clear the search."
                      : "Choose GitHub available to import an authorized repository. Imported snapshots will appear here after the server confirms them."
                  }
                  action={
                    !query ? (
                      <button
                        type="button"
                        className="workspace-button workspace-button-secondary"
                        onClick={() => setTab("github")}
                      >
                        Browse GitHub repositories <ArrowUpRight size={14} />
                      </button>
                    ) : undefined
                  }
                />
              )}
            </section>
          ) : (
            <section className="workspace-section" aria-labelledby="github-title">
              <div className="workspace-section-heading">
                <div>
                  <span className="workspace-eyebrow">READ-ONLY GITHUB APP ACCESS</span>
                  <h2 id="github-title">Available repositories</h2>
                </div>
                <span className="workspace-section-count">{filteredGithub.length} shown</span>
              </div>
              <div className="workspace-provider-note">
                <Github size={16} />
                <p>
                  รายการจาก GitHub App ของบัญชีคุณ — กดนำเข้าเพื่อ snapshot read-only
                  แล้วเปิดแท็บ Deploy เพื่อเผยแพร่จาก repository เดียวกัน (ไม่รันโค้ดบนเซิร์ฟเวอร์ Workspace)
                </p>
                {githubInstallUrl && (
                  <a
                    href={githubInstallUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="workspace-install-link"
                  >
                    Open GitHub App setup <ExternalLink size={13} />
                  </a>
                )}
              </div>
              {githubRepositories.capped && (
                <p className="workspace-capped-note">
                  GitHub returned a capped list. Refine your installation selection
                  or search to locate a repository.
                </p>
              )}
              {filteredGithub.length > 0 ? (
                <div className="workspace-repo-grid">
                  {filteredGithub.map(repository => (
                    <GitHubRepositoryCard
                      key={`${repository.installationId}:${repository.id}`}
                      repository={repository}
                      imported={importedRepositories.some(item => item.fullName === repository.fullName)}
                      importing={importingKey === repository.fullName}
                      onImport={() => void handleImport(repository)}
                      onPublish={() => goToDeploy(repository.fullName)}
                    />
                  ))}
                </div>
              ) : (
                <StatePanel
                  icon={<Github size={20} />}
                  title={query ? "No matching repositories" : "No repositories available"}
                  description={
                    query
                      ? "Try another name or clear the search."
                      : "No repositories were returned for the current GitHub App access. Use the installation link above if you need to change the selected repositories."
                  }
                />
              )}
            </section>
          )}
        </>
      )}
    </WorkspaceChrome>
  );
}
