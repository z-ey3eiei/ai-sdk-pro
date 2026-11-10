import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getPlatformDb } from "./db/client";
import { importedRepository, repositoryFile } from "./db/schema";
import type {
  ImportedRepository,
  RepositoryDetail,
  RepositoryFile,
  RepositoryFileSummary,
} from "./platform-types";
import { SNAPSHOT_LIMITS } from "./platform-types";

function database() {
  const db = getPlatformDb();
  if (!db) throw new Error("Platform database is unavailable.");
  return db;
}

function mapRepository(row: typeof importedRepository.$inferSelect): ImportedRepository {
  return {
    id: row.id,
    githubId: row.githubId,
    fullName: row.fullName,
    description: row.description,
    defaultBranch: row.defaultBranch,
    commitSha: row.commitSha,
    private: row.private,
    language: row.language,
    htmlUrl: row.htmlUrl,
    importedAt: row.importedAt.toISOString(),
    importedFiles: row.importedFiles,
    skippedFiles: row.skippedFiles,
    totalBytes: row.totalBytes,
    snapshotTruncated: row.snapshotTruncated,
  };
}

function mapFileSummary(row: typeof repositoryFile.$inferSelect): RepositoryFileSummary {
  return { path: row.path, bytes: row.bytes, language: row.language };
}

export async function listOwnedRepositories(userId: string): Promise<ImportedRepository[]> {
  const rows = await database()
    .select()
    .from(importedRepository)
    .where(eq(importedRepository.userId, userId))
    .orderBy(desc(importedRepository.importedAt));
  return rows.map(mapRepository);
}

export async function getOwnedRepository(
  userId: string,
  repositoryId: string
): Promise<ImportedRepository | null> {
  const rows = await database()
    .select()
    .from(importedRepository)
    .where(and(eq(importedRepository.id, repositoryId), eq(importedRepository.userId, userId)))
    .limit(1);
  return rows[0] ? mapRepository(rows[0]) : null;
}

export async function getOwnedRepositoryDetail(
  userId: string,
  repositoryId: string
): Promise<RepositoryDetail | null> {
  const repository = await getOwnedRepository(userId, repositoryId);
  if (!repository) return null;
  const files = await database()
    .select()
    .from(repositoryFile)
    .where(eq(repositoryFile.repositoryId, repositoryId))
    .orderBy(repositoryFile.path);
  return {
    repository,
    files: files.map(mapFileSummary),
    snapshotLimits: SNAPSHOT_LIMITS,
  };
}

export async function getOwnedRepositoryFile(
  userId: string,
  repositoryId: string,
  path: string
): Promise<RepositoryFile | null> {
  const rows = await database()
    .select({ file: repositoryFile })
    .from(repositoryFile)
    .innerJoin(
      importedRepository,
      and(
        eq(repositoryFile.repositoryId, importedRepository.id),
        eq(importedRepository.userId, userId)
      )
    )
    .where(and(eq(repositoryFile.repositoryId, repositoryId), eq(repositoryFile.path, path)))
    .limit(1);
  const file = rows[0]?.file;
  if (!file) return null;
  return { ...mapFileSummary(file), content: file.content };
}
