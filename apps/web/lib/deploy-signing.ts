import { createHash, createHmac } from "node:crypto";

export const DEPLOY_BRIDGE_PATH = "/internal/workspace";

export function signDeployBridgeBody(
  body: string,
  secret: string,
  timestamp = Date.now()
): { timestamp: string; signature: string } {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("A 32-byte deployment bridge secret is required.");
  }
  const timestampValue = String(timestamp);
  const digest = createHash("sha256").update(body, "utf8").digest("hex");
  const signingText = ["POST", DEPLOY_BRIDGE_PATH, timestampValue, digest].join("\n");
  return {
    timestamp: timestampValue,
    signature: createHmac("sha256", secret).update(signingText).digest("hex"),
  };
}
