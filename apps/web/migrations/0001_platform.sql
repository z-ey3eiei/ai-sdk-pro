CREATE SCHEMA IF NOT EXISTS aisdk_pro;

CREATE TABLE IF NOT EXISTS aisdk_pro."user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON aisdk_pro."user" (email);

CREATE TABLE IF NOT EXISTS aisdk_pro.session (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES aisdk_pro."user"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS session_token_idx ON aisdk_pro.session (token);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON aisdk_pro.session (user_id);

CREATE TABLE IF NOT EXISTS aisdk_pro.account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES aisdk_pro."user"(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON aisdk_pro.account (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_idx ON aisdk_pro.account (provider_id, account_id);

CREATE TABLE IF NOT EXISTS aisdk_pro.verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS aisdk_pro.imported_repository (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES aisdk_pro."user"(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  default_branch TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  private BOOLEAN NOT NULL,
  language TEXT,
  html_url TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL,
  imported_files INTEGER NOT NULL,
  skipped_files INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL,
  snapshot_truncated BOOLEAN NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS imported_repository_user_github_idx ON aisdk_pro.imported_repository (user_id, github_id);
CREATE INDEX IF NOT EXISTS imported_repository_user_imported_at_idx ON aisdk_pro.imported_repository (user_id, imported_at);

CREATE TABLE IF NOT EXISTS aisdk_pro.repository_file (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL REFERENCES aisdk_pro.imported_repository(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  language TEXT,
  content TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS repository_file_repository_path_idx ON aisdk_pro.repository_file (repository_id, path);
CREATE INDEX IF NOT EXISTS repository_file_repository_idx ON aisdk_pro.repository_file (repository_id);

CREATE TABLE IF NOT EXISTS aisdk_pro.platform_migration_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO aisdk_pro.platform_migration_version (version)
VALUES ('0001_platform')
ON CONFLICT (version) DO NOTHING;
