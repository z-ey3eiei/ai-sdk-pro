import type { MetadataRoute } from "next";
import { docs } from "../../docs/lib/content";
import { SITE_ORIGIN } from "../lib/seo-metadata";
import { starterTemplates } from "../lib/starter-catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_ORIGIN,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}/templates`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...starterTemplates.map(starter => ({
      url: `${SITE_ORIGIN}/templates/${starter.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...docs.map(doc => ({
      url: `${SITE_ORIGIN}/docs/${doc.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
