import { getNeonSql } from "@/lib/db/client";
import { classifyDeploymentEvent, readWebhookPayload, verifyDeploymentSignature, WebhookPayloadTooLarge } from "@/lib/deployment-events";
import { randomUUID } from "node:crypto";
import { readPilotDeploymentIdentity } from "@/lib/pilot-deployment-oidc";
import { jsonError, noStoreHeaders } from "@/lib/platform-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // The preview relay is confined to the trusted pilot branch on staging.
  const authorization = request.headers.get("authorization");
  if (authorization && process.env.BETTER_AUTH_URL?.trim() === "https://staging.ai-sdk.pro") {
    const pilot = await readPilotDeploymentIdentity(authorization);
    if (!pilot) return jsonError("Invalid pilot workflow identity.", 401);
    return enqueue(randomUUID(), pilot);
  }

  const secret = process.env.GITHUB_DEPLOY_WEBHOOK_SECRET?.trim();
  if (!secret) return jsonError("Deployment webhook is unavailable.", 503);
  const delivery = request.headers.get("x-github-delivery");
  if (!delivery || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(delivery))
    return jsonError("Invalid delivery identifier.", 400);

  let payload: Buffer;
  try {
    payload = await readWebhookPayload(request);
  } catch (error) {
    if (error instanceof WebhookPayloadTooLarge) return jsonError("Webhook payload is too large.", 413);
    return jsonError("Could not read webhook payload.", 400);
  }
  if (!verifyDeploymentSignature(payload, request.headers.get("x-hub-signature-256"), secret))
    return jsonError("Invalid webhook signature.", 401);

  let body: unknown;
  try {
    body = JSON.parse(payload.toString("utf8"));
  } catch {
    return jsonError("Invalid webhook JSON.", 400);
  }

  const event = classifyDeploymentEvent(request.headers.get("x-github-event"), body);
  if (!event) return Response.json({ accepted: true, received: false }, { status: 202, headers: noStoreHeaders() });
  return enqueue(delivery, event);
}

async function enqueue(delivery: string, event: NonNullable<ReturnType<typeof classifyDeploymentEvent>>) {
  const sql = getNeonSql();
  if (!sql) return jsonError("Deployment storage is unavailable.", 503);
  try {
    const result = await sql`
      INSERT INTO aisdk_pro.deployment_intake (project_id, delivery_id, target, target_key, branch, commit_sha)
      SELECT project.id, ${delivery}::uuid,
        CASE WHEN ${event.pullRequest}::bigint IS NULL AND project.production_branch = ${event.branch}
          THEN 'production' ELSE 'preview' END,
        CASE WHEN ${event.pullRequest}::bigint IS NOT NULL THEN 'pr:' || ${event.pullRequest}::text
          ELSE 'branch:' || ${event.branch} END,
        ${event.branch}, ${event.commit}
      FROM aisdk_pro.deployment_project AS project
      JOIN aisdk_pro.imported_repository AS repo ON repo.id = project.repository_id
      WHERE project.auto_deploy AND project.github_installation_id = ${event.installationId}
        AND repo.github_id = ${event.repositoryId}
      ON CONFLICT DO NOTHING
      RETURNING project_id
    `;
    return Response.json({ accepted: true, received: Array.isArray(result) && result.length > 0 }, {
      status: 202,
      headers: noStoreHeaders(),
    });
  } catch {
    return jsonError("Deployment storage is unavailable.", 503);
  }
}
