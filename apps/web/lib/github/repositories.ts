import "server-only";

import { githubApiPath, githubRequest } from "./client";
import type { GitHubRepository } from "../platform-types";
import { SNAPSHOT_LIMITS } from "../platform-types";
import {
  decodeTextBlob,
  inferRepositoryLanguage,
  selectSnapshotCandidates,
  type RepositorySnapshot,
  type SnapshotCandidate,
  type SnapshotFile,
} from "../repository-snapshot";

const MAX_INSTALLATIONS = 50;
const MAX_REPOSITORIES = 200;
const MAX_PAGES = 5;
const MAX_CONCURRENCY = 5;
const IMPORT_DEADLINE_MS = 90_000;

type Installation = { id: number };
type InstallationRepositories = {
  repositories: GitHubApiRepository[];
  total_count: number;
};
type GitHubApiRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
  owner: { login: string; avatar_url: string };
};
type GitTreeResponse = {
  tree: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
  }>;
  truncated: boolean;
};
type GitBlobResponse = { content: string; encoding: string; size: number };
type GitCommitResponse = { sha: string };

function mapRepository(
  repo: GitHubApiRepository,
  installationId: number
): GitHubRepository {
  return {
    id: repo.id,
    installationId,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    defaultBranch: repo.default_branch,
    private: repo.private,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    updatedAt: repo.updated_at,
    htmlUrl: repo.html_url,
    owner: { login: repo.owner.login, avatarUrl: repo.owner.avatar_url },
  };
}

function repositoryPath(fullName: string, ...suffix: string[]): string {
  const [owner, name] = fullName.split("/");
  if (!owner || !name || fullName.split("/").length !== 2)
    throw new Error("Invalid repository name.");
  return githubApiPath("repos", owner, name, ...suffix);
}

async function listInstallationRepositories(
  accessToken: string,
  installationId: number,
  signal?: AbortSignal
): Promise<GitHubRepository[]> {
  if (!Number.isSafeInteger(installationId) || installationId <= 0)
    throw new Error("Invalid installation.");
  const result: GitHubRepository[] = [];
  for (
    let page = 1;
    page <= MAX_PAGES && result.length < MAX_REPOSITORIES;
    page++
  ) {
    const payload = await githubRequest<InstallationRepositories>(
      `/user/installations/${installationId}/repositories?per_page=100&page=${page}`,
      accessToken,
      signal
    );
    for (const repository of payload.repositories) {
      result.push(mapRepository(repository, installationId));
      if (result.length >= MAX_REPOSITORIES) break;
    }
    if (payload.repositories.length < 100) break;
  }
  return result;
}

export async function listAccessibleGitHubRepositories(
  accessToken: string,
  signal?: AbortSignal
): Promise<GitHubRepository[]> {
  const timeout = AbortSignal.timeout(60_000);
  const deadline = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const installations: Installation[] = [];
  for (
    let page = 1;
    page <= MAX_PAGES && installations.length < MAX_INSTALLATIONS;
    page++
  ) {
    const payload = await githubRequest<{ installations: Installation[] }>(
      `/user/installations?per_page=100&page=${page}`,
      accessToken,
      deadline
    );
    installations.push(...payload.installations);
    if (payload.installations.length < 100) break;
  }
  const all: GitHubRepository[] = [];
  for (const installation of installations.slice(0, MAX_INSTALLATIONS)) {
    const repositories = await listInstallationRepositories(
      accessToken,
      installation.id,
      deadline
    );
    all.push(...repositories);
    if (all.length >= MAX_REPOSITORIES) break;
  }
  const unique = new Map<number, GitHubRepository>();
  for (const repository of all)
    if (!unique.has(repository.id)) unique.set(repository.id, repository);
  return [...unique.values()]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .slice(0, MAX_REPOSITORIES);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, run)
  );
  return output;
}

export async function buildRepositorySnapshot(
  accessToken: string,
  requested: { fullName: string; installationId: number }
): Promise<RepositorySnapshot> {
  const deadline = AbortSignal.timeout(IMPORT_DEADLINE_MS);
  const accessible = await listInstallationRepositories(
    accessToken,
    requested.installationId,
    deadline
  );
  const repository = accessible.find(
    item => item.fullName.toLowerCase() === requested.fullName.toLowerCase()
  );
  if (!repository) {
    const error = new Error("GitHub access was denied for this repository.");
    error.name = "GitHubPermissionError";
    throw error;
  }
  const commit = await githubRequest<GitCommitResponse>(
    repositoryPath(repository.fullName, "commits", repository.defaultBranch),
    accessToken,
    deadline
  );
  const tree = await githubRequest<GitTreeResponse>(
    `${repositoryPath(repository.fullName, "git", "trees", commit.sha)}?recursive=1`,
    accessToken,
    deadline
  );
  const candidates: SnapshotCandidate[] = tree.tree
    .filter(entry => entry.type === "blob" && typeof entry.size === "number")
    .map(entry => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size ?? 0,
    }));
  const selection = selectSnapshotCandidates(candidates);
  let skippedFiles = selection.skippedFiles + (tree.truncated ? 1 : 0);
  const fetched = await mapWithConcurrency(
    selection.selected,
    MAX_CONCURRENCY,
    async candidate => {
      try {
        const blob = await githubRequest<GitBlobResponse>(
          repositoryPath(repository.fullName, "git", "blobs", candidate.sha),
          accessToken,
          deadline
        );
        if (blob.encoding !== "base64") return null;
        const bytes = Uint8Array.from(Buffer.from(blob.content, "base64"));
        const content = decodeTextBlob(bytes);
        if (content === null) return null;
        return {
          path: candidate.path,
          bytes: bytes.byteLength,
          language: inferRepositoryLanguage(candidate.path),
          content,
        } satisfies SnapshotFile;
      } catch (error) {
        // Only content-level exclusions above are skipped. Permission, rate-limit,
        // transport and malformed-provider failures must abort the whole import.
        throw error;
      }
    }
  );
  const files: SnapshotFile[] = [];
  let totalBytes = 0;
  for (const file of fetched) {
    if (!file) {
      skippedFiles += 1;
      continue;
    }
    if (
      file.bytes > SNAPSHOT_LIMITS.maxFileBytes ||
      totalBytes + file.bytes > SNAPSHOT_LIMITS.maxTotalBytes
    ) {
      skippedFiles += 1;
      continue;
    }
    files.push(file);
    totalBytes += file.bytes;
  }
  return {
    repository,
    commitSha: commit.sha,
    files,
    skippedFiles,
    totalBytes,
    snapshotTruncated:
      selection.snapshotTruncated || skippedFiles > selection.skippedFiles,
  };
}
