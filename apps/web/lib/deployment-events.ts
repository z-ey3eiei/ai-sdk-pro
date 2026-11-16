import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const maximumPayloadBytes = 1024 * 1024;
const githubId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const commit = z.string().regex(/^[a-f0-9]{40}$/).refine(value => value !== "0".repeat(40));
const branch = z.string().min(1).max(255).regex(/^[^\s\u0000-\u001f\u007f]+$/);
const envelope = z.object({
  repository: z.object({ id: githubId, full_name: z.string() }),
  installation: z.object({ id: githubId }),
});
const push = envelope.extend({ ref: z.string(), after: commit, deleted: z.literal(false) });
const pullRequest = envelope.extend({
  action: z.enum(["opened", "synchronize", "reopened"]),
  number: githubId,
  pull_request: z.object({
    base: z.object({ repo: z.object({ id: githubId }) }),
    head: z.object({ ref: branch, sha: commit, repo: z.object({ id: githubId }) }),
  }),
});

export class WebhookPayloadTooLarge extends Error {}

export async function readWebhookPayload(request: Request): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > maximumPayloadBytes) throw new WebhookPayloadTooLarge();
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > maximumPayloadBytes) {
        await reader.cancel().catch(() => undefined);
        throw new WebhookPayloadTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export function verifyDeploymentSignature(payload: Buffer, signature: string | null, secret: string): boolean {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

export function classifyDeploymentEvent(event: string | null, payload: unknown) {
  if (event === "push") {
    const result = push.safeParse(payload);
    if (!result.success || !result.data.ref.startsWith("refs/heads/")) return null;
    const ref = branch.safeParse(result.data.ref.slice("refs/heads/".length));
    if (!ref.success) return null;
    return {
      repositoryId: result.data.repository.id,
      installationId: result.data.installation.id,
      branch: ref.data,
      commit: result.data.after,
      pullRequest: null,
    };
  }

  if (event === "pull_request") {
    const result = pullRequest.safeParse(payload);
    if (!result.success) return null;
    const { repository, installation, number, pull_request } = result.data;
    if (pull_request.head.repo.id !== repository.id || pull_request.base.repo.id !== repository.id) return null;
    return {
      repositoryId: repository.id,
      installationId: installation.id,
      branch: pull_request.head.ref,
      commit: pull_request.head.sha,
      pullRequest: number,
    };
  }

  return null;
}
