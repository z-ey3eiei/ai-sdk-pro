import type { MetadataRoute } from "next";
import { docs } from "../../docs/lib/content";
import { starterTemplates } from "../lib/starter-catalog";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://ai-sdk.pro", changeFrequency: "weekly", priority: 1 },
    {
      url: "https://ai-sdk.pro/templates",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...starterTemplates.map(starter => ({
      url: `https://ai-sdk.pro/templates/${starter.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...docs.map(doc => ({
      url: `https://ai-sdk.pro/docs/${doc.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
