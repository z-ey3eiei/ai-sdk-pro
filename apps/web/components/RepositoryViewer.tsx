"use client";

import Link from "next/link";
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
import styles from "./RepositoryViewer.module.css";
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

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    setDetailState({ kind: "loading" });
    setFileState({ kind: "idle" });
    setSelectedPath(null);

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
    <main className={`repository-viewer-page ${styles.page}`}>
      <header className="repository-viewer-topbar">
        <div className="repository-viewer-topbar-inner">
          <Brand />
          <div className="repository-viewer-topbar-links">
            <Link href="/workspace" className="repository-viewer-back-link">
              <ArrowLeft size={14} /> กลับไปพื้นที่ทำงาน
            </Link>
          </div>
        </div>
      </header>

      {detailState.kind === "loading" && (
        <section className="repository-viewer-state">
          <LoaderCircle className="repository-viewer-spin" size={24} />
          <h1>กำลังโหลด snapshot ของ repository</h1>
          <p>กำลังโหลดข้อมูล repository และรายการไฟล์ที่ผูกกับ commit</p>
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
              <RefreshCw size={14} /> ลองอีกครั้ง
            </button>
            {detailState.error.kind === "signed-out" && (
              <Link
                href="/login"
                className="repository-viewer-button repository-viewer-button-primary"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </section>
      )}

      {detail && (
        <>
          <section className="repository-viewer-header">
            <div className="repository-viewer-heading-row">
              <div className="repository-viewer-title-block">
                <span className="repository-viewer-eyebrow">SNAPSHOT ที่นำเข้า</span>
                <h1>{detail.repository.fullName}</h1>
                <p>
                  {detail.repository.description || "ไม่มีคำอธิบาย repository"}
                </p>
              </div>
              <div className="repository-viewer-header-actions">
                <a
                  href={detail.repository.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="repository-viewer-button repository-viewer-button-secondary"
                >
                  <Github size={14} /> เปิดบน GitHub
                </a>
                <Link
                  href="/workspace"
                  className="repository-viewer-button repository-viewer-button-primary"
                >
                  <Library size={14} /> ดู repository ทั้งหมด
                </Link>
              </div>
            </div>
            <div className="repository-viewer-meta-grid">
              <div>
                <span>การมองเห็น</span>
                <strong>
                  {detail.repository.private ? <LockKeyhole size={13} /> : <Github size={13} />}
                  {detail.repository.private ? "ส่วนตัว" : "สาธารณะ"}
                </strong>
              </div>
              <div>
                <span>Branch หลัก</span>
                <strong>
                  <GitBranch size={13} /> {detail.repository.defaultBranch}
                </strong>
              </div>
              <div>
                <span>Commit SHA ที่ snapshot อ้างอิง</span>
                <strong className="repository-viewer-commit">
                  {detail.repository.commitSha || "ไม่พร้อมใช้งาน"}
                </strong>
              </div>
              <div>
                <span>วันที่นำเข้า</span>
                <strong>{formatDate(detail.repository.importedAt)}</strong>
              </div>
            </div>
          </section>

          <section className="repository-viewer-scope-note">
            <ShieldCheck size={16} />
            <p>
              หน้านี้แสดง snapshot แบบอ่านอย่างเดียวที่บันทึกบนเซิร์ฟเวอร์: ไม่เกิน {detail.snapshotLimits.maxFiles} ไฟล์,
              {" "}{formatBytes(detail.snapshotLimits.maxFileBytes)} ต่อไฟล์ และ {formatBytes(detail.snapshotLimits.maxTotalBytes)} รวม
              {" "}{detail.repository.skippedFiles} ไฟล์ถูกข้ามระหว่างนำเข้า โดยไม่แสดงไฟล์ไบนารี dependencies และ path ที่ละเอียดอ่อน
            </p>
            {detail.repository.snapshotTruncated && <span>ถึงขีดจำกัด snapshot</span>}
          </section>

          <section className="repository-viewer-workbench" aria-label="ตัวดู source snapshot">
            <aside className="repository-viewer-files">
              <div className="repository-viewer-files-heading">
                <div>
                  <span className="repository-viewer-eyebrow">ไฟล์ใน snapshot</span>
                  <h2>{detail.files.length} ไฟล์ที่รวมไว้</h2>
                </div>
                <FileCode2 size={17} />
              </div>
              {detail.files.length > 0 ? (
                <div className="repository-viewer-file-list" role="listbox" aria-label="ไฟล์ใน snapshot">
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
                  <p>ไม่มีไฟล์ข้อความที่ถูกรวมไว้ใน snapshot นี้</p>
                </div>
              )}
            </aside>

            <div className="repository-viewer-code-pane">
              <div className="repository-viewer-code-heading">
                <div>
                  <span className="repository-viewer-code-path">
                    {selectedPath || "ยังไม่ได้เลือกไฟล์"}
                  </span>
                  <span className="repository-viewer-code-subtitle">
                    {selectedSummary ? `${formatBytes(selectedSummary.bytes)} · snapshot ตาม commit` : "เลือกไฟล์เพื่ออ่านเนื้อหา"}
                  </span>
                </div>
                <LanguagePill language={selectedSummary?.language || null} />
              </div>
              {fileState.kind === "loading" && (
                <div className="repository-viewer-code-state">
                  <LoaderCircle className="repository-viewer-spin" size={20} />
                  <span>กำลังโหลดเนื้อหาไฟล์…</span>
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
                      เข้าสู่ระบบ
                    </Link>
                  )}
                </div>
              )}
              {fileState.kind === "idle" && (
                <div className="repository-viewer-code-state">
                  <FileCode2 size={20} />
                  <span>เลือกไฟล์ข้อความจากรายการ snapshot เพื่อดูเนื้อหา</span>
                </div>
              )}
              {fileState.kind === "ready" && (
                <pre className="repository-viewer-code"><code>{fileState.file.content}</code></pre>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
