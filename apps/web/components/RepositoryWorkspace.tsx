"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  Database,
  Download,
  ExternalLink,
  Github,
  Globe2,
  GitBranch,
  Library,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "@aisdkpro/ui";
import styles from "./RepositoryWorkspace.module.css";
import { authClient } from "../lib/auth-client";
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
type Tab = "imported" | "github";

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

function displayName(user: PlatformSession["user"]): string {
  return user?.name?.trim() || user?.email?.trim() || "Signed-in account";
}

function initials(user: PlatformSession["user"]): string {
  const value = displayName(user);
  return value
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

function WorkspaceChrome({
  children,
  user,
  onLogout,
  logoutPending,
}: {
  children: React.ReactNode;
  user: PlatformSession["user"];
  onLogout: () => void;
  logoutPending: boolean;
}) {
  return (
    <main className={`workspace-shell ${styles.shell}`}>
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-top">
          <Brand />
          <span className="workspace-product-label">พื้นที่ทำงาน</span>
        </div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <Link href="/workspace" className="workspace-nav-item active">
            <Library size={16} />
            <span>คลังโค้ด</span>
          </Link>
          <Link href="/docs/architecture" className="workspace-nav-item">
            <Database size={16} />
            <span>How snapshots work</span>
            <ArrowUpRight className="workspace-nav-external" size={12} />
          </Link>
        </nav>
        <div className="workspace-sidebar-note">
          <ShieldCheck size={15} />
          <p>
            พื้นที่นี้อ่านข้อมูลอย่างเดียว snapshot จะไม่ถูก clone, build, run หรือ deploy
          </p>
        </div>
        <div className="workspace-sidebar-footer">
          <span className="workspace-sidebar-kicker">AI-SDK.PRO</span>
          <span>ตรวจสอบ snapshot จาก repository</span>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb">
            <Link href="/workspace">Workspace</Link>
            <ChevronRight size={14} />
            <span>คลังโค้ด</span>
          </div>
          <div className="workspace-account">
            {user ? (
              <>
                <span className="workspace-account-copy">
                  <strong>{displayName(user)}</strong>
                  <span>บัญชี GitHub</span>
                </span>
                <span className="workspace-avatar" aria-hidden="true">
                  {initials(user)}
                </span>
                <button
                  type="button"
                  className="workspace-icon-button"
                  onClick={onLogout}
                  disabled={logoutPending}
                  aria-label="ออกจากระบบ"
                  title="ออกจากระบบ"
                >
                  {logoutPending ? (
                    <LoaderCircle className="workspace-spin" size={15} />
                  ) : (
                    <LogOut size={15} />
                  )}
                </button>
              </>
            ) : (
              <Link href="/login" className="workspace-sign-in-link">
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </header>
        <div className="workspace-content">{children}</div>
      </section>
    </main>
  );
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
      {isPrivate ? "ส่วนตัว" : "สาธารณะ"}
    </span>
  );
}

function ImportedRepositoryCard({ repository }: { repository: ImportedRepository }) {
  return (
    <Link
      href={`/workspace/repositories/${encodeURIComponent(repository.id)}`}
      className="workspace-repo-card workspace-repo-card-imported"
    >
      <div className="workspace-repo-card-heading">
        <span className="workspace-repo-mark workspace-repo-mark-imported">
          <Library size={17} />
        </span>
        <span className="workspace-repo-card-title">
          <strong>{repository.fullName}</strong>
          <span>
            นำเข้าเมื่อ {formatDate(repository.importedAt)}
          </span>
        </span>
        <ChevronRight className="workspace-card-arrow" size={17} />
      </div>
      <p className="workspace-repo-description">
        {repository.description || "ไม่มีคำอธิบาย repository"}
      </p>
      <div className="workspace-repo-meta">
        <RepositoryPrivateBadge isPrivate={repository.private} />
        <span>
          <GitBranch size={12} /> {repository.defaultBranch}
        </span>
        <span>
          <GitBranch size={12} /> {repository.importedFiles} ไฟล์
        </span>
        <span>{formatBytes(repository.totalBytes)}</span>
      </div>
      <div className="workspace-repo-commit">
        <span>Commit ที่ snapshot อ้างอิง</span>
        <code>{repository.commitSha.slice(0, 12) || "ไม่พร้อมใช้งาน"}</code>
        {repository.snapshotTruncated && <span className="workspace-truncated">ถึงขีดจำกัด</span>}
      </div>
    </Link>
  );
}

function GitHubRepositoryCard({
  repository,
  imported,
  importing,
  onImport,
}: {
  repository: GitHubRepository;
  imported: boolean;
  importing: boolean;
  onImport: () => void;
}) {
  return (
    <article className="workspace-repo-card workspace-repo-card-github">
      <div className="workspace-repo-card-heading">
        <span className="workspace-repo-mark workspace-repo-mark-github">
          <Github size={17} />
        </span>
        <span className="workspace-repo-card-title">
          <strong>{repository.fullName}</strong>
          <span>อัปเดตเมื่อ {formatDate(repository.updatedAt)}</span>
        </span>
        <a
          className="workspace-card-external"
          href={repository.htmlUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`เปิด ${repository.fullName} บน GitHub`}
          onClick={event => event.stopPropagation()}
        >
          <ExternalLink size={15} />
        </a>
      </div>
      <p className="workspace-repo-description">
        {repository.description || "ไม่มีคำอธิบาย repository"}
      </p>
      <div className="workspace-repo-meta">
        <RepositoryPrivateBadge isPrivate={repository.private} />
        <span>
          <GitBranch size={12} /> {repository.defaultBranch}
        </span>
        {repository.language && <span>{repository.language}</span>}
        <span>{repository.stargazersCount} ดาว</span>
      </div>
      <div className="workspace-repo-action-row">
        <span className="workspace-read-only-label">
          <ShieldCheck size={12} /> นำเข้าแบบอ่านอย่างเดียว
        </span>
        <button
          type="button"
          className="workspace-button workspace-button-primary workspace-import-button"
          disabled={imported || importing}
          onClick={onImport}
        >
          {importing ? (
            <LoaderCircle className="workspace-spin" size={14} />
          ) : imported ? (
            "นำเข้าแล้ว"
          ) : (
            <>
              <Download size={14} /> นำเข้า snapshot
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export default function RepositoryWorkspace() {
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
      setTab("imported");
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
          title="กำลังตรวจสอบสิทธิ์พื้นที่ทำงาน"
          description="กำลังตรวจสอบเซสชันและโหลดข้อมูล repository ที่ได้รับอนุญาต"
        />
      )}

      {phase === "error" && (
        <StatePanel
          icon={<CircleAlert size={22} />}
          title="ยังไม่สามารถเปิดพื้นที่ทำงานได้"
          description={requestError || "โหลดข้อมูล repository ในขณะนี้ไม่ได้"}
          action={
            <button
              type="button"
              className="workspace-button workspace-button-secondary"
              onClick={() => setRefreshKey(value => value + 1)}
            >
              <RefreshCw size={14} /> ลองอีกครั้ง
            </button>
          }
        />
      )}

      {phase === "signed-out" && (
        <StatePanel
          icon={<Github size={22} />}
          title="เข้าสู่ระบบเพื่อดู repository"
          description={
            requestError ||
            "ไม่มีเซสชันที่ใช้งานอยู่ เข้าสู่ระบบด้วย GitHub เพื่อดูรายการ repository ที่คุณอนุญาต"
          }
          action={
            <Link href="/login" className="workspace-button workspace-button-primary">
              ไปหน้าเข้าสู่ระบบ <ArrowUpRight size={14} />
            </Link>
          }
        />
      )}

      {phase === "setup" && (
        <StatePanel
          icon={<CircleAlert size={22} />}
          title="การตั้งค่าพื้นที่ทำงานยังไม่พร้อม"
          description={
            requestError ||
            "การตั้งค่า GitHub App หรือ Neon ยังไม่พร้อม ระบบจึงยังไม่ได้ร้องขอรายการ repository"
          }
          action={
            <div className="workspace-setup-details">
              {status?.missingConfiguration?.length ? (
                <span>
                  รายการตั้งค่าที่ยังขาด: {status.missingConfiguration.join(", ")}
                </span>
              ) : (
                <span>เจ้าของแอปต้องดำเนินการตั้งค่าระบบให้เสร็จ</span>
              )}
            </div>
          }
        />
      )}

      {phase === "ready" && status && githubRepositories && (
        <>
          <section className="workspace-hero">
            <div>
              <span className="workspace-eyebrow">พื้นที่ตรวจสอบ REPOSITORY</span>
              <h1>ตรวจดูซอร์สโค้ด โดยไม่เรียกใช้งาน</h1>
              <p>
                นำเข้า snapshot ที่มีขอบเขตจาก repository ที่อนุญาต ผูกกับ commit ที่ระบบตอบกลับ แล้วตรวจดูไฟล์ได้ในที่เดียว โดยไม่ clone, build, run หรือ deploy โค้ด
              </p>
            </div>
            <div className="workspace-limit-card">
              <span className="workspace-limit-card-title">
                <ShieldCheck size={14} /> ขอบเขต snapshot
              </span>
              <strong>
                ไม่เกิน {status.snapshotLimits.maxFiles} ไฟล์ · รวม {formatBytes(status.snapshotLimits.maxTotalBytes)}
              </strong>
              <span>
                ไฟล์ละไม่เกิน {formatBytes(status.snapshotLimits.maxFileBytes)} · ข้ามไฟล์ไบนารีและ path ที่ละเอียดอ่อน
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
            <div className="workspace-tabs" role="tablist" aria-label="แหล่ง repository">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "imported"}
                className={tab === "imported" ? "active" : ""}
                onClick={() => setTab("imported")}
              >
                <Library size={14} /> Snapshot ที่นำเข้า
                <span>{importedRepositories.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "github"}
                className={tab === "github" ? "active" : ""}
                onClick={() => setTab("github")}
              >
                <Github size={14} /> จาก GitHub
                <span>{githubRepositories.repositories.length}</span>
              </button>
            </div>
            <label className="workspace-search">
              <Search size={15} />
              <span className="sr-only">ค้นหา repository</span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="ค้นหา repository…"
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

          {tab === "imported" ? (
            <section className="workspace-section" aria-labelledby="imported-title">
              <div className="workspace-section-heading">
                <div>
                  <span className="workspace-eyebrow">บันทึกไว้สำหรับบัญชีนี้</span>
                  <h2 id="imported-title">Snapshot ที่นำเข้า</h2>
                </div>
                <span className="workspace-section-count">แสดง {filteredImported.length} รายการ</span>
              </div>
              {filteredImported.length > 0 ? (
                <div className="workspace-repo-grid">
                  {filteredImported.map(repository => (
                    <ImportedRepositoryCard key={repository.id} repository={repository} />
                  ))}
                </div>
              ) : (
                <StatePanel
                  icon={<Library size={20} />}
                  title={query ? "ไม่พบ snapshot ที่ตรงกัน" : "ยังไม่มี snapshot ที่นำเข้า"}
                  description={
                    query
                      ? "ลองค้นด้วยชื่อ repository อื่น หรือล้างคำค้น"
                      : "เลือกแท็บจาก GitHub เพื่อดู repository ที่อนุญาตและนำเข้า snapshot รายการจะแสดงที่นี่เมื่อเซิร์ฟเวอร์ยืนยันแล้ว"
                  }
                  action={
                    !query ? (
                      <button
                        type="button"
                        className="workspace-button workspace-button-secondary"
                        onClick={() => setTab("github")}
                      >
                        เรียกดู repository จาก GitHub <ArrowUpRight size={14} />
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
                  <span className="workspace-eyebrow">สิทธิ์ GitHub App · อ่านอย่างเดียว</span>
                  <h2 id="github-title">Repository ที่เลือกได้</h2>
                </div>
                <span className="workspace-section-count">แสดง {filteredGithub.length} รายการ</span>
              </div>
              <div className="workspace-provider-note">
                <Github size={16} />
                <p>
                  รายการนี้มาจาก GitHub App installations ปัจจุบัน การนำเข้าจะบันทึกเฉพาะ source snapshot ตามขีดจำกัดที่กำหนด ไม่ clone, execute, build หรือ deploy โค้ด
                </p>
                {githubInstallUrl && (
                  <a
                    href={githubInstallUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="workspace-install-link"
                  >
                    ตั้งค่า GitHub App <ExternalLink size={13} />
                  </a>
                )}
              </div>
              {githubRepositories.capped && (
                <p className="workspace-capped-note">
                  GitHub ส่งรายการมาแบบจำกัดผลลัพธ์ ปรับ repository ที่เลือกในการติดตั้งหรือค้นหาชื่อที่ต้องการ
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
                    />
                  ))}
                </div>
              ) : (
                <StatePanel
                  icon={<Github size={20} />}
                  title={query ? "ไม่พบ repository ที่ตรงกัน" : "ไม่มี repository ให้เลือก"}
                  description={
                    query
                      ? "ลองใช้ชื่ออื่นหรือล้างคำค้น"
                      : "ไม่พบ repository ภายใต้สิทธิ์ GitHub App ปัจจุบัน ใช้ลิงก์การติดตั้งด้านบนเพื่อปรับรายการที่เลือก"
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
