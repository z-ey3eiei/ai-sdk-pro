import type { GitHubRepository } from "./platform-types";
import { SNAPSHOT_LIMITS } from "./platform-types";

export type SnapshotCandidate = { path: string; sha: string; size: number };
export type SnapshotFile = { path: string; bytes: number; language: string | null; content: string };
export type RepositorySnapshot = {
  repository: GitHubRepository;
  commitSha: string;
  files: SnapshotFile[];
  skippedFiles: number;
  totalBytes: number;
  snapshotTruncated: boolean;
};

const BINARY_EXTENSIONS = new Set([
  "7z", "avi", "bmp", "class", "dll", "dmg", "doc", "docx", "eot", "exe", "gif", "ico", "iso", "jar", "jpeg", "jpg", "mov", "mp3", "mp4", "otf", "pdf", "png", "so", "tar", "tgz", "ttf", "wav", "webm", "webp", "woff", "woff2", "xls", "xlsx", "zip",
]);
const DEPENDENCY_SEGMENTS = new Set([".git", ".next", "build", "coverage", "dist", "node_modules", "target", "vendor"]);
const DEPENDENCY_FILENAMES = new Set(["bun.lock", "cargo.lock", "composer.lock", "gemfile.lock", "go.sum", "npm-shrinkwrap.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const SENSITIVE_NAME = /(^|\/)(?:\.env(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|id_rsa(?:\..*)?|private[_-]?key(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks))$/i;
const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  c: "c", cc: "cpp", cpp: "cpp", css: "css", go: "go", h: "c", hpp: "cpp", html: "html", java: "java", js: "javascript", jsx: "javascript", json: "json", md: "markdown", mjs: "javascript", mts: "typescript", py: "python", rb: "ruby", rs: "rust", sh: "shell", sql: "sql", svg: "xml", ts: "typescript", tsx: "typescript", vue: "vue", xml: "xml", yaml: "yaml", yml: "yaml",
};

export function normalizeRepositoryPath(path: string): string | null {
  if (!path || path.length > 1024 || path.includes("\\") || path.startsWith("/")) return null;
  const segments = path.split("/");
  if (segments.some(segment => !segment || segment === "." || segment === "..")) return null;
  return segments.join("/");
}
export function isSensitiveRepositoryPath(path: string): boolean { return SENSITIVE_NAME.test(path); }
export function isSkippableRepositoryPath(path: string): boolean {
  const normalized = normalizeRepositoryPath(path);
  if (!normalized || isSensitiveRepositoryPath(normalized)) return true;
  const segments = normalized.split("/");
  if (segments.some(segment => DEPENDENCY_SEGMENTS.has(segment.toLowerCase()))) return true;
  const filename = segments.at(-1)?.toLowerCase() || "";
  if (DEPENDENCY_FILENAMES.has(filename)) return true;
  const extension = filename.includes(".") ? filename.split(".").at(-1) || "" : "";
  return BINARY_EXTENSIONS.has(extension);
}
export function inferRepositoryLanguage(path: string): string | null {
  const filename = path.split("/").at(-1) || "";
  const extension = filename.includes(".") ? filename.split(".").at(-1)?.toLowerCase() : undefined;
  return extension ? LANGUAGE_BY_EXTENSION[extension] ?? null : null;
}
export function selectSnapshotCandidates(candidates: SnapshotCandidate[]): { selected: SnapshotCandidate[]; skippedFiles: number; snapshotTruncated: boolean } {
  let skippedFiles = 0;
  const eligible: SnapshotCandidate[] = [];
  for (const candidate of candidates) {
    const path = normalizeRepositoryPath(candidate.path);
    if (!path || isSkippableRepositoryPath(path) || !Number.isFinite(candidate.size) || candidate.size < 0 || candidate.size > SNAPSHOT_LIMITS.maxFileBytes) {
      skippedFiles += 1;
      continue;
    }
    eligible.push({ ...candidate, path });
  }
  eligible.sort((a, b) => a.path.localeCompare(b.path));
  const selected = eligible.slice(0, SNAPSHOT_LIMITS.maxFiles);
  skippedFiles += Math.max(0, eligible.length - selected.length);
  return { selected, skippedFiles, snapshotTruncated: skippedFiles > 0 || eligible.length > selected.length };
}
export function decodeTextBlob(bytes: Uint8Array): string | null {
  if (bytes.byteLength > SNAPSHOT_LIMITS.maxFileBytes || bytes.includes(0)) return null;
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return null; }
}
