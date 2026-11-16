import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}.`);
  return value;
}

async function main() {
  const project = required("PREVIEW_PILOT_PROJECT_ID");
  const repository = required("PREVIEW_PILOT_REPOSITORY");
  const installation = required("PREVIEW_PILOT_INSTALLATION_ID");
  const token = required("PREVIEW_PILOT_GITHUB_TOKEN");
  const workflowRef = required("PREVIEW_PILOT_WORKFLOW_REF");
  if (!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(repository) || !/^[1-9][0-9]*$/.test(installation))
    throw new Error("Invalid pilot repository or installation.");
  const sql = neon(required("NEON_DATABASE_URL"));

  // Dispatch can succeed even if the HTTP response is lost. Require reconciliation before retrying.
  await sql`
    UPDATE aisdk_pro.deployment_intake SET dispatch_status = 'uncertain'
    WHERE project_id = ${project} AND target = 'preview' AND dispatch_status = 'dispatching'
      AND dispatch_started_at < now() - interval '10 minutes'
  `;

  const rows = await sql`
    WITH candidate AS (
      SELECT intake.delivery_id
      FROM aisdk_pro.deployment_intake AS intake
      JOIN aisdk_pro.deployment_project AS project ON project.id = intake.project_id
      JOIN aisdk_pro.imported_repository AS repo ON repo.id = project.repository_id
      WHERE intake.project_id = ${project} AND intake.target = 'preview'
        AND intake.dispatch_status = 'pending' AND project.auto_deploy
        AND project.github_installation_id = ${installation}::bigint
        AND lower(repo.full_name) = lower(${repository})
      ORDER BY intake.received_at, intake.delivery_id
      LIMIT 1 FOR UPDATE OF intake SKIP LOCKED
    )
    UPDATE aisdk_pro.deployment_intake AS intake
    SET dispatch_status = 'dispatching', dispatch_started_at = now()
    FROM candidate
    WHERE intake.project_id = ${project} AND intake.delivery_id = candidate.delivery_id
    RETURNING intake.delivery_id, intake.target_key, intake.commit_sha
  `;
  if (!rows.length) {
    console.log("No queued pilot preview.");
    return;
  }

  const job = rows[0];
  const slot = "preview-" + createHash("sha256").update(job.target_key).digest("hex").slice(0, 20);
  const path = repository.split("/").map(encodeURIComponent).join("/");
  let state = "uncertain";
  let runId: number | null = null;
  try {
    const response = await fetch(`https://api.github.com/repos/${path}/actions/workflows/aisdk-preview.yml/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      body: JSON.stringify({
        ref: workflowRef,
        return_run_details: true,
        inputs: { commit: job.commit_sha, slot, delivery: job.delivery_id },
      }),
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 200) {
      const result = await response.json();
      if (Number.isSafeInteger(result.workflow_run_id) && result.workflow_run_id > 0) {
        runId = result.workflow_run_id;
        state = "submitted";
      }
    } else if (response.status === 204) {
      state = "submitted";
    } else if ([400, 401, 403, 404, 422, 429].includes(response.status)) {
      state = "rejected";
    }
  } catch {
    // The delivery ID is visible in the workflow run name for manual reconciliation.
  }

  await sql`
    UPDATE aisdk_pro.deployment_intake
    SET dispatch_status = ${state}, github_run_id = ${runId}
    WHERE project_id = ${project} AND delivery_id = ${job.delivery_id}::uuid
      AND dispatch_status = 'dispatching'
  `;
  console.log(`Preview delivery ${job.delivery_id}: ${state}${runId ? ` (run ${runId})` : ""}`);
  if (state !== "submitted") process.exitCode = 1;
}

void main().catch(() => {
  console.error("Preview dispatch failed. Inspect the pilot database and workflow history.");
  process.exitCode = 1;
});
