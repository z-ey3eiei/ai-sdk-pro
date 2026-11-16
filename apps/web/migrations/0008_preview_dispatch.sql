ALTER TABLE aisdk_pro.deployment_intake
  ADD COLUMN IF NOT EXISTS dispatch_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (dispatch_status IN ('pending', 'dispatching', 'submitted', 'rejected', 'uncertain')),
  ADD COLUMN IF NOT EXISTS dispatch_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS github_run_id BIGINT;

CREATE INDEX IF NOT EXISTS deployment_intake_pending_preview_idx
  ON aisdk_pro.deployment_intake (project_id, received_at)
  WHERE target = 'preview' AND dispatch_status = 'pending';
