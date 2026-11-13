import type { Metadata } from "next";

export const SITE_ORIGIN = "https://ai-sdk.pro";
export const SOCIAL_IMAGE = `${SITE_ORIGIN}/opengraph-image`;
export const HOME_PAGE_TITLE = "Server-side web build & deploy workbench preview";
export const SITE_DESCRIPTION =
  "ต้นแบบ frontend สำหรับวาง workflow จาก repository ผ่าน server-side build runner ไปยัง deployment target; ยังไม่เชื่อม terminal หรือ deploy pipeline. ai-sdk.pro มี read-only workspace, starter และ BYOK playground.";

type SeoPageType = "website" | "article";
type SeoLocale = "en_US" | "th_TH";

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: SeoPageType;
  locale?: SeoLocale;
  keywords?: string[];
};

export function createSeoMetadata({
  title,
  description,
  path,
  type = "website",
  locale = "en_US",
  keywords,
}: SeoMetadataInput): Metadata {
  const canonicalUrl =
    path === "/" ? SITE_ORIGIN : new URL(path, SITE_ORIGIN).toString();
  const socialTitle = `${title} | ai-sdk.pro`;
  const imageAlt = `${title} — ai-sdk.pro`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type,
      siteName: "ai-sdk.pro",
      locale,
      title: socialTitle,
      description,
      url: canonicalUrl,
      images: [
        {
          url: SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SOCIAL_IMAGE],
    },
  };
}
