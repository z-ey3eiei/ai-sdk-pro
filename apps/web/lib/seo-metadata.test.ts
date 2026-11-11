import { describe, expect, it } from "vitest";

import { createSeoMetadata, SITE_ORIGIN, SOCIAL_IMAGE } from "./seo-metadata";

describe("createSeoMetadata", () => {
  it("emits route-specific absolute canonical and share metadata", () => {
    const metadata = createSeoMetadata({
      title: "AI agent starter templates",
      description: "Download practical AI agent starters and setup guides.",
      path: "/templates",
      keywords: ["AI agent starters", "AI SDK 6", "streaming chat"],
    });

    expect(metadata).toMatchObject({
      title: "AI agent starter templates",
      description: "Download practical AI agent starters and setup guides.",
      keywords: ["AI agent starters", "AI SDK 6", "streaming chat"],
      alternates: { canonical: `${SITE_ORIGIN}/templates` },
      openGraph: {
        type: "website",
        siteName: "ai-sdk.pro",
        url: `${SITE_ORIGIN}/templates`,
        images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        images: [SOCIAL_IMAGE],
      },
    });
  });

  it("uses the slashless site origin as the homepage canonical", () => {
    const metadata = createSeoMetadata({
      title: "Build AI agents with real tools",
      description: "Build tool-enabled AI agents on ai-sdk.pro.",
      path: "/",
    });

    expect(metadata.alternates).toEqual({ canonical: SITE_ORIGIN });
  });

  it("supports Thai article previews without changing the canonical host", () => {
    const metadata = createSeoMetadata({
      title: "Getting Started Guide",
      description: "เริ่มสร้าง AI agent ด้วยคู่มือภาษาไทย",
      path: "/docs/getting-started",
      type: "article",
      locale: "th_TH",
    });

    expect(metadata).toMatchObject({
      alternates: { canonical: `${SITE_ORIGIN}/docs/getting-started` },
      openGraph: {
        type: "article",
        locale: "th_TH",
        url: `${SITE_ORIGIN}/docs/getting-started`,
      },
      twitter: { card: "summary_large_image" },
    });
  });
});
