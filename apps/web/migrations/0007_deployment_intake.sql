CREATE TABLE IF NOT EXISTS aisdk_pro.deployment_project (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL UNIQUE REFERENCES aisdk_pro.imported_repository(id) ON DELETE CASCADE,
  github_installation_id BIGINT NOT NULL CHECK (github_installation_id > 0),
  production_branch TEXT NOT NULL CHECK (char_length(production_branch) BETWEEN 1 AND 255),
  auto_deploy BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS deployment_project_installation_idx
  ON aisdk_pro.deployment_project (github_installation_id) WHERE auto_deploy;

CREATE TABLE IF NOT EXISTS aisdk_pro.deployment_intake (
  project_id TEXT NOT NULL REFERENCES aisdk_pro.deployment_project(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('production','preview')),
  target_key TEXT NOT NULL,
  branch TEXT NOT NULL,
  commit_sha TEXT NOT NULL CHECK (commit_sha ~ '^[a-f0-9]{40}$'),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, delivery_id),
  UNIQUE (project_id, target, target_key, commit_sha)
);
