import "server-only";

import { randomUUID } from "node:crypto";

import { getNeonSql } from "./db/client";
import type { ImportedRepository } from "./platform-types";
import type { RepositorySnapshot } from "./repository-snapshot";

export async function persistRepositorySnapshot(
  userId: string,
  snapshot: RepositorySnapshot
): Promise<string> {
  const sql = getNeonSql();
  if (!sql) throw new Error("Platform database is unavailable.");
  const repositoryId = randomUUID();
  const importedAt = new Date();

  await sql.transaction(tx => [
    tx`DELETE FROM aisdk_pro.imported_repository WHERE user_id = ${userId} AND github_id = ${snapshot.repository.id}`,
    tx`INSERT INTO aisdk_pro.imported_repository
      (id, user_id, github_id, full_name, description, default_branch, commit_sha, private, language, html_url, imported_at, imported_files, skipped_files, total_bytes, snapshot_truncated)
      VALUES (${repositoryId}, ${userId}, ${snapshot.repository.id}, ${snapshot.repository.fullName}, ${snapshot.repository.description}, ${snapshot.repository.defaultBranch}, ${snapshot.commitSha}, ${snapshot.repository.private}, ${snapshot.repository.language}, ${snapshot.repository.htmlUrl}, ${importedAt}, ${snapshot.files.length}, ${snapshot.skippedFiles}, ${snapshot.totalBytes}, ${snapshot.snapshotTruncated})`,
    ...snapshot.files.map(file =>
      tx`INSERT INTO aisdk_pro.repository_file
        (id, repository_id, path, bytes, language, content)
        VALUES (${randomUUID()}, ${repositoryId}, ${file.path}, ${file.bytes}, ${file.language}, ${file.content})`
    ),
  ]);
  return repositoryId;
}

export type PersistedRepository = ImportedRepository;
