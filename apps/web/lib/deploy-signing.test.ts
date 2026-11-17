import { describe, expect, it } from "vitest";
import { signDeployBridgeBody } from "./deploy-signing";

const secret = "synthetic-control-plane-secret-32-bytes-minimum";

describe("first-party deploy bridge authentication", () => {
  it("creates unique HMACs for changed payloads", () => {
    const a = signDeployBridgeBody('{"actor":{"githubId":1}}', secret, 1794880000000);
    const b = signDeployBridgeBody('{"actor":{"githubId":2}}', secret, 1794880000000);
    expect(a.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(a.signature).not.toBe(b.signature);
    expect(a.timestamp).toBe("1794880000000");
  });
  it("refuses weak signing secrets", () => {
    expect(() => signDeployBridgeBody("{}", "short")).toThrow();
  });
});
