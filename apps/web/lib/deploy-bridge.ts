import "server-only";

import { randomUUID } from "node:crypto";
import { getGitHubAccessToken, requireSessionUser } from "./auth";
import { githubRequest, githubApiPath } from "./github/client";
import { listAccessibleGitHubRepositories } from "./github/repositories";
import { DEPLOY_BRIDGE_PATH, signDeployBridgeBody } from "./deploy-signing";

const DEPLOY_STAGING_ORIGIN = "https://deploy-staging.ai-sdk.pro";

export type DeploymentProject = {
  id: string;
  name: string;
  repo_full_name: string;
  repo_id: number;
  branch: string;
  framework: string;
  output_dir: string | null;
  active_deployment_id: string | null;
};
export type ProjectList = {
  projects: DeploymentProject[];
  routingReady: boolean;
  frameworkBuilds: boolean;
  projectDomain: string;
  plan?: 'free' | 'pro';
  quota?: { maxProjects: number; usedProjects: number };
  automaticUpdates?: boolean;
};
export type DeploymentEntry = {
  id: string;
  commit_sha: string;
  status: string;
  url: string | null;
  created_at: number;
  finished_at: number | null;
};

export class DeploymentBridgeError extends Error {
  constructor(message: string, readonly status = 503) {
    super(message);
    this.name = "DeploymentBridgeError";
  }
}

function bridgeSecret(): string {
  const secret = process.env.PLATFORM_BRIDGE_SECRET ?? "";
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new DeploymentBridgeError("Deployment backend connection is not configured.");
  }
  return secret;
}

type GitHubIdentity = { id: number; login: string };
type DeployRequest = Record<string, unknown>;

export async function authenticatedDeployContext(request: Request) {
  const session = await requireSessionUser(request);
  const githubToken = await getGitHubAccessToken(request, session.id);
  const profile = await githubRequest<GitHubIdentity>("/user", githubToken, request.signal);
  if (!Number.isSafeInteger(profile.id) || profile.id <= 0 ||
      !/^[A-Za-z0-9-]{1,39}$/.test(profile.login)) {
    throw new DeploymentBridgeError("GitHub account could not be verified.", 401);
  }
  return { token: githubToken, actor: { githubId: profile.id, login: profile.login } };
}

export async function controlPlane<T>(
  actor: { githubId: number; login: string },
  operation: "list" | "import" | "history" | "deploy",
  fields: DeployRequest = {}
): Promise<T> {
  const secret = bridgeSecret();
  const body = JSON.stringify({ actor, operation, ...fields });
  const signature = signDeployBridgeBody(body, secret);
  let response: Response;
  try {
    response = await fetch(DEPLOY_STAGING_ORIGIN + DEPLOY_BRIDGE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-AISDK-Timestamp": signature.timestamp,
        "X-AISDK-Signature": signature.signature,
      },
      cache: "no-store",
      redirect: "error",
      body,
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new DeploymentBridgeError("Deployment backend is currently unreachable.");
  }
  if (!response.ok) {
    const publicStatuses = new Set([400, 401, 403, 404, 409, 429, 503]);
    const status = publicStatuses.has(response.status) ? response.status : 502;
    let reason = "Deployment backend rejected the request.";
    try {
      const data = await response.json() as { error?: unknown };
      if (typeof data.error === "string" && data.error.length < 180 &&
          !/secret|token|password|private.key/i.test(data.error)) reason = data.error;
    } catch { /* do not leak upstream internals */ }
    throw new DeploymentBridgeError(reason, status);
  }
  return response.json() as Promise<T>;
}

export async function authorizedRepositoryForDeployment(
  githubToken: string,
  fullName: string,
  installationId?: number
) {
  // Existing Next.js GitHub OAuth session is the ONLY browser login.
  const accessible = await listAccessibleGitHubRepositories(githubToken);
  const repo = accessible.find(item =>
    item.fullName.toLowerCase() === fullName.toLowerCase() &&
    (installationId === undefined || item.installationId === installationId)
  );
  if (!repo) throw new DeploymentBridgeError("Install the GitHub App for this repository first.", 403);
  const [owner, name] = repo.fullName.split("/");
  const permission = await githubRequest<{ id: number; permissions?: { push?: boolean; admin?: boolean } }>(
    githubApiPath("repos", owner, name), githubToken
  );
  if (permission.id !== repo.id || !(permission.permissions?.push || permission.permissions?.admin))
    throw new DeploymentBridgeError("Repository write permission is required.", 403);
  return repo;
}

export function newDeploymentIdempotencyKey() {
  return randomUUID();
}
