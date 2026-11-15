CREATE TABLE IF NOT EXISTS aisdk_pro.platform_token (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES aisdk_pro."user"(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 64),
  prefix TEXT NOT NULL,
  digest TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL DEFAULT 'repo:read' CHECK (scope = 'repo:read'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days')
);
CREATE INDEX IF NOT EXISTS platform_token_user_idx
  ON aisdk_pro.platform_token (user_id, created_at DESC);
