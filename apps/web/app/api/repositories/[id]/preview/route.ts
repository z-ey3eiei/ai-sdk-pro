import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { requireSessionUser } from "@/lib/auth";
import {
  checkPlatformRateLimit,
  getPlatformConfig,
  isTrustedMutationOrigin,
  jsonError,
  noStoreHeaders,
  safePlatformError,
} from "@/lib/platform-policy";
import { getOwnedRepository } from "@/lib/repository-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const STATUS_SET = new Set(["pending", "dispatching", "submitted", "rejected", "uncertain"]);

function sqlClient() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new Error("Platform database is unavailable.");
  return neon(databaseUrl);
}

export async function GET(request: Request, context: Context): Promise<Response> {
  if (!getPlatformConfig().configured) return jsonError("Platform setup is required.", 503);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, "read")) return jsonError("Too many requests.", 429);
    const { id } = await context.params;
    const repository = await getOwnedRepository(user.id, id);
    if (!repository) return jsonError("Repository not found.", 404);
    const sql = sqlClient();

    // Ownership is checked before DB access; the join binds project to the owned repository.
    const rows = await sql`
      SELECT intake.delivery_id, intake.target, intake.commit_sha, intake.received_at,
        intake.dispatch_status, intake.github_run_id
      FROM aisdk_pro.deployment_intake intake
      JOIN aisdk_pro.deployment_project project ON project.id = intake.project_id
      WHERE project.repository_id = ${id} AND intake.target = 'preview'
      ORDER BY intake.received_at DESC
      LIMIT 25
    `;
    const projects = await sql`
      SELECT id, auto_deploy FROM aisdk_pro.deployment_project
      WHERE repository_id = ${id} LIMIT 1
    `;
    return Response.json({
      configured: projects.length > 0,
      dispatchEnabled: projects[0]?.auto_deploy === true,
      events: rows.map(row => ({
        deliveryId: String(row.delivery_id),
        commit: String(row.commit_sha),
        status: STATUS_SET.has(String(row.dispatch_status)) ? row.dispatch_status : "unknown",
        receivedAt: String(row.received_at),
        runId: row.github_run_id == null ? null : Number(row.github_run_id),
      })),
    }, { headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) return jsonError("Origin is not allowed.", 403);
  if (!getPlatformConfig().configured) return jsonError("Platform setup is required.", 503);
  try {
    const user = await requireSessionUser(request);
    if (!checkPlatformRateLimit(user.id, "import")) return jsonError("Too many requests.", 429);
    const { id } = await context.params;
    const repository = await getOwnedRepository(user.id, id);
    if (!repository) return jsonError("Repository not found.", 404);
    if (!/^[a-f0-9]{40}$/.test(repository.commitSha)) {
      return jsonError("A pinned repository commit is required for preview dispatch.", 400);
    }
    // Never accept an arbitrary client SHA or execute source in the web container.
    const sql = sqlClient();
    const targetKey = "preview-" + repository.commitSha;
    const deliveryId = randomUUID();
    const rows = await sql`
      INSERT INTO aisdk_pro.deployment_intake (
        project_id, delivery_id, target, target_key, branch, commit_sha
      )
      SELECT project.id, ${deliveryId}::uuid, 'preview', ${targetKey},
        ${repository.defaultBranch}, ${repository.commitSha}
      FROM aisdk_pro.deployment_project project
      WHERE project.repository_id = ${id} AND project.auto_deploy = true
      ON CONFLICT (project_id,target,target_key,commit_sha) DO NOTHING
      RETURNING delivery_id
    `;
    if (!rows.length) {
      return Response.json({
        queued: false,
        message: "Preview is not enabled or this commit is already queued.",
      }, { status: 409, headers: noStoreHeaders() });
    }
    return Response.json({
      queued: true,
      deliveryId: String(rows[0].delivery_id),
      message: "Preview intake queued for the external dispatcher. No code was executed on web.",
    }, { status: 202, headers: noStoreHeaders() });
  } catch (error) {
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}
