export const SNAPSHOT_LIMITS = {
  maxFiles: 100,
  maxFileBytes: 64 * 1024,
  maxTotalBytes: 2 * 1024 * 1024,
} as const;

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}
export interface PlatformSession {
  user: PlatformUser | null;
  expiresAt?: string | null;
}
export interface PlatformStatus {
  githubConfigured?: boolean;
  socialProviders?: Record<"github" | "google" | "facebook" | "apple", boolean>;
  configured: boolean;
  missingConfiguration: string[];
  githubAppInstallUrl: string | null;
  snapshotLimits: typeof SNAPSHOT_LIMITS;
  sessionIdleSeconds?: number;
}
export interface GitHubRepository {
  id: number;
  installationId: number;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  language: string | null;
  stargazersCount: number;
  updatedAt: string;
  htmlUrl: string;
  owner: { login: string; avatarUrl: string };
}
export interface GitHubRepositoryList {
  repositories: GitHubRepository[];
  capped: boolean;
  installUrl: string | null;
}
export interface ImportedRepository {
  id: string;
  githubId: number;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  commitSha: string;
  private: boolean;
  language: string | null;
  htmlUrl: string;
  importedAt: string;
  importedFiles: number;
  skippedFiles: number;
  totalBytes: number;
  snapshotTruncated: boolean;
}
export interface RepositoryFileSummary {
  path: string;
  bytes: number;
  language: string | null;
}
export interface RepositoryDetail {
  repository: ImportedRepository;
  files: RepositoryFileSummary[];
  snapshotLimits: typeof SNAPSHOT_LIMITS;
}
export interface RepositoryFile extends RepositoryFileSummary {
  content: string;
}
export interface ImportRepositoryInput {
  fullName: string;
  installationId: number;
}
