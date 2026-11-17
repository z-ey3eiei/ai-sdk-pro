-- Platform roles are separate from pricing entitlements and never browser-set.
-- Backfill is an operator-only action after verifying the GitHub numeric ID.
CREATE TABLE IF NOT EXISTS account_roles (
  github_id INTEGER PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('member','developer','owner')),
  granted_at INTEGER NOT NULL DEFAULT (unixepoch())
);
