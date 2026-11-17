import { describe, expect, it } from "vitest";
import { keylessRuntimeEnabled } from "./runtime-gate";

const strongSecret = "safe-example-not-a-real-secret-more-than-32-bytes";

describe("fail-closed keyless Worker rollout gate", () => {
  it("rejects a missing flag even with a valid signing secret", () => {
    expect(keylessRuntimeEnabled({ AGENT_AUTH_SECRET: strongSecret })).toBe(false);
  });

  it("rejects a missing or weak secret even with an enabled flag", () => {
    expect(keylessRuntimeEnabled({ KEYLESS_ENABLED: "true", AGENT_AUTH_SECRET: "" })).toBe(false);
    expect(keylessRuntimeEnabled({ KEYLESS_ENABLED: "true", AGENT_AUTH_SECRET: "short" })).toBe(false);
  });

  it("rejects truthy-looking values that are not explicitly true", () => {
    for (const flag of ["TRUE", "1", "yes", "false", ""]) {
      expect(keylessRuntimeEnabled({ KEYLESS_ENABLED: flag, AGENT_AUTH_SECRET: strongSecret })).toBe(false);
    }
  });

  it("accepts a strong secret only after explicit enablement", () => {
    expect(keylessRuntimeEnabled({ KEYLESS_ENABLED: "true", AGENT_AUTH_SECRET: strongSecret })).toBe(true);
  });
});
