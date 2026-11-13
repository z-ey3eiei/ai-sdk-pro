import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

const appSans = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-app-sans",
});

const siteUrl = "https://ai-sdk.pro";
const docsDescription =
  "คู่มือภาษาไทยสำหรับสร้าง AI agents, tools, streaming chat, client SDK และ self-hosting ai-sdk.pro.";
const docsImage = `${siteUrl}/docs/og?slug=getting-started`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Thai AI Agent Documentation",
    template: "%s | ai-sdk.pro",
  },
  description: docsDescription,
  keywords: [
    "AI SDK documentation",
    "คู่มือ AI agent",
    "streaming chat",
    "self-hosted AI",
    "TypeScript AI SDK",
  ],
  openGraph: {
    type: "website",
    siteName: "ai-sdk.pro",
    locale: "th_TH",
    title: "Thai AI Agent Documentation | ai-sdk.pro",
    description: docsDescription,
    images: [
      {
        url: docsImage,
        width: 1200,
        height: 630,
        alt: "Thai AI agent documentation from ai-sdk.pro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thai AI Agent Documentation | ai-sdk.pro",
    description: docsDescription,
    images: [docsImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      className={appSans.variable}
      suppressHydrationWarning
    >
      <body>
        <RootProvider
          theme={{ attribute: "class", defaultTheme: "light", enableSystem: false }}
          search={{ options: { api: "/api/search" } }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
