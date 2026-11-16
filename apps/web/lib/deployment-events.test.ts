import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { classifyDeploymentEvent, readWebhookPayload, verifyDeploymentSignature, WebhookPayloadTooLarge } from "./deployment-events";

const sha = "a".repeat(40);
const repo = { repository: { id: 101, full_name: "owner/site" }, installation: { id: 42 } };

describe("deployment webhook intake", () => {
  it("requires the GitHub signature over the original bytes", () => {
    const raw = Buffer.from('{"text": "ไทย"}');
    const secret = "test-only";
    const signature = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
    expect(verifyDeploymentSignature(raw, signature, secret)).toBe(true);
    expect(verifyDeploymentSignature(Buffer.from('{"text":"ไทย"}'), signature, secret)).toBe(false);
  });

  it("caps streamed delivery bodies even without content-length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024 + 1));
        controller.close();
      },
    });
    const request = new Request("https://example.com", { method: "POST", body, ...{ duplex: "half" as const } });
    await expect(readWebhookPayload(request)).rejects.toBeInstanceOf(WebhookPayloadTooLarge);
  });

  it("pins branch pushes and ignores tags and deletions", () => {
    const event = { ...repo, ref: "refs/heads/feature/preview", after: sha, deleted: false };
    expect(classifyDeploymentEvent("push", event)).toEqual({
      repositoryId: 101, installationId: 42, branch: "feature/preview", commit: sha, pullRequest: null,
    });
    expect(classifyDeploymentEvent("push", { ...event, ref: "refs/tags/release" })).toBeNull();
    expect(classifyDeploymentEvent("push", { ...event, deleted: true })).toBeNull();
    expect(classifyDeploymentEvent("push", { ...event, installation: undefined })).toBeNull();
    expect(classifyDeploymentEvent("push", { ...event, after: "0".repeat(40) })).toBeNull();
  });

  it("accepts updates to same-repository PRs and ignores forks and closed PRs", () => {
    const base = { repo: { id: 101 } };
    const head = { ref: "feature", sha, repo: { id: 101 } };
    const event = { ...repo, action: "synchronize", number: 7, pull_request: { base, head } };
    expect(classifyDeploymentEvent("pull_request", event)).toMatchObject({ pullRequest: 7, commit: sha });
    expect(classifyDeploymentEvent("pull_request", { ...event, action: "closed" })).toBeNull();
    expect(classifyDeploymentEvent("pull_request", {
      ...event, pull_request: { base, head: { ...head, repo: { id: 177 } } },
    })).toBeNull();
  });
});
