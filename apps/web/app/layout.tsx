import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "@aisdkpro/ui/styles.css";
import SessionActivity from "../components/SessionActivity";
import {
  HOME_PAGE_TITLE,
  SITE_DESCRIPTION,
  SITE_ORIGIN,
} from "../lib/seo-metadata";

const appSans = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-app-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: HOME_PAGE_TITLE,
    template: "%s | ai-sdk.pro",
  },
  description: SITE_DESCRIPTION,
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ai-sdk.pro",
  url: SITE_ORIGIN,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${appSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData),
          }}
        />
        <SessionActivity>{children}</SessionActivity>
      </body>
    </html>
  );
}
