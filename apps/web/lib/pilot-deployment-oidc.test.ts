import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPilotDeploymentIdentity } from "./pilot-deployment-oidc";

const issuer = "https://token.actions.githubusercontent.com";
const ref = "refs/heads/aisdk/preview-pilot";
const repository = "z-ey3eiei/urban-couscous";
const sha = "f".repeat(40);
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const encode = (data: object) => Buffer.from(JSON.stringify(data)).toString("base64url");
function identity(overrides: object = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: issuer, aud: "https://staging.ai-sdk.pro/api/github/webhook", sub: `repo:${repository}:ref:${ref}`,
    repository, repository_id: "1458143895", event_name: "push", ref,
    workflow_ref: `${repository}/.github/workflows/aisdk-preview.yml@${ref}`,
    sha, workflow_sha: sha, iat: now, nbf: now, exp: now + 300, ...overrides,
  };
  const unsigned = encode({ alg: "RS256", kid: "test" }) + "." + encode(claims);
  return "Bearer " + unsigned + "." + sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
}

afterEach(() => vi.unstubAllGlobals());

describe("preview pilot workflow identity", () => {
  it("accepts a signed push identity and derives the commit from its claims", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: "test" }] })));
    await expect(readPilotDeploymentIdentity(identity())).resolves.toMatchObject({ repositoryId: 1458143895, commit: sha });
  });

  it("rejects foreign workflows, other audiences and production branches", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const changed of [{ ref: "refs/heads/main" }, { repository_id: "213" }, { aud: "https://ai-sdk.pro" }, { event_name: "pull_request" }])
      await expect(readPilotDeploymentIdentity(identity(changed))).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
