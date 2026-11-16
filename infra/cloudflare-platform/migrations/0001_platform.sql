CREATE TABLE users (
  id TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL UNIQUE,
  username TEXT NOT NULL,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  github_token_encrypted TEXT NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL UNIQUE,
  repo_full_name TEXT NOT NULL,
  repo_id INTEGER NOT NULL,
  installation_id INTEGER NOT NULL,
  branch TEXT NOT NULL,
  framework TEXT NOT NULL DEFAULT 'auto' CHECK(framework IN ('auto','static','astro','nextjs')),
  build_command TEXT,
  output_dir TEXT,
  auto_deploy INTEGER NOT NULL DEFAULT 1 CHECK(auto_deploy IN (0,1)),
  active_deployment_id TEXT,
  suspended_at INTEGER,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX projects_repo ON projects(installation_id,repo_id,branch) WHERE deleted_at IS NULL;
CREATE INDEX projects_user ON projects(user_id) WHERE deleted_at IS NULL;
CREATE TABLE deployments (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  commit_sha TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','building','success','failed','superseded')),
  github_delivery TEXT,
  build_log_key TEXT,
  artifact_key TEXT,
  url TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  enqueued_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(project_id,github_delivery)
);
CREATE INDEX deployments_project ON deployments(project_id,seq DESC);
CREATE INDEX deployments_quota ON deployments(user_id,created_at);
CREATE INDEX deployments_pending ON deployments(status,enqueued_at,created_at);
CREATE TABLE custom_domains (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  domain TEXT NOT NULL UNIQUE,
  cloudflare_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX domains_project ON custom_domains(project_id);
CREATE TABLE env_vars (
  project_id TEXT NOT NULL REFERENCES projects(id),
  key TEXT NOT NULL,
  value_encrypted TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(project_id,key)
);
CREATE TRIGGER project_quota BEFORE INSERT ON projects BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM projects WHERE user_id=NEW.user_id AND deleted_at IS NULL)
    >= (SELECT CASE plan WHEN 'pro' THEN 25 ELSE 3 END FROM users WHERE id=NEW.user_id)
    THEN RAISE(ABORT,'project_quota') END;
END;
CREATE TRIGGER deployment_quota BEFORE INSERT ON deployments
WHEN NEW.github_delivery IS NULL OR NOT EXISTS (
  SELECT 1 FROM deployments WHERE project_id=NEW.project_id AND github_delivery=NEW.github_delivery
) BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM deployments WHERE user_id=NEW.user_id AND created_at>=unixepoch()-86400)
    >= (SELECT CASE plan WHEN 'pro' THEN 100 ELSE 10 END FROM users WHERE id=NEW.user_id)
    THEN RAISE(ABORT,'deployment_quota') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM deployments WHERE user_id=NEW.user_id AND status IN ('pending','building'))
    >= (SELECT CASE plan WHEN 'pro' THEN 5 ELSE 1 END FROM users WHERE id=NEW.user_id)
    THEN RAISE(ABORT,'concurrent_quota') END;
END;
CREATE TRIGGER variable_quota BEFORE INSERT ON env_vars
WHEN NOT EXISTS (SELECT 1 FROM env_vars WHERE project_id=NEW.project_id AND key=NEW.key) BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM env_vars WHERE project_id=NEW.project_id)>=32
    THEN RAISE(ABORT,'variable_quota') END;
END;
CREATE TRIGGER domain_quota BEFORE INSERT ON custom_domains BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM custom_domains WHERE project_id=NEW.project_id)>=3
    THEN RAISE(ABORT,'domain_quota') END;
END;
