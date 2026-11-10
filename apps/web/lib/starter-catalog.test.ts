import { describe, expect, it } from "vitest";
import { getStarter, starterTemplates } from "./starter-catalog";
import { SITE_INFO } from "./site-info";

describe("runnable starter catalog", () => {
  it("contains exactly the three authored starters and honest external handoff", () => {
    expect(starterTemplates.map(item => item.slug)).toEqual([
      "streaming-chat",
      "docs-assistant",
      "agent-launchpad",
    ]);
    for (const item of starterTemplates) {
      expect(item.devstackUrl).toBe(
        `https://devstack.bid/templates/${item.devstackTemplateId}`
      );
      expect(item.guideUrl).toBe("/docs/using-templates");
      expect(item.downloadUrl).toMatch(
        /^\/starters\/[a-z-]+-[a-f0-9]{12}\.zip$/
      );
      expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.bytes).toBeGreaterThan(0);
      expect(item.fileCount).toBeGreaterThan(0);
      const query = new URL(item.tryUrl, SITE_INFO.origin).searchParams;
      expect(query.get("prompt")).toBeTruthy();
      expect(query.has("apiKey")).toBe(false);
      expect(query.has("token")).toBe(false);
    }
  });
  it("rejects unknown slugs and uses the owner-confirmed contact", () => {
    expect(getStarter("../etc/passwd")).toBeUndefined();
    expect(getStarter("not-a-template")).toBeUndefined();
    expect(SITE_INFO.contactEmail).toBe("sdkbank@1origin.dev");
    expect(SITE_INFO.devstackRepository).toBe(
      "https://github.com/developer-devstack/devstack.bid"
    );
  });
});
