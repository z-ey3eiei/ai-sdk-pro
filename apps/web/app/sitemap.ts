import type { MetadataRoute } from "next";
import { docs } from "../../docs/lib/content";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://ai-sdk.pro", changeFrequency: "weekly", priority: 1 },
    ...docs.map(doc => ({
      url: `https://ai-sdk.pro/docs/${doc.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
