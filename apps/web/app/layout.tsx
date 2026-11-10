import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "@aisdkpro/ui/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-sdk.pro"),
  title: {
    default: "ai-sdk.pro — Your agents, one endpoint",
    template: "%s · ai-sdk.pro",
  },
  description:
    "Build tool-enabled AI agents, stream every response, and deploy on your own infrastructure. An independent platform powered by Vercel AI SDK 6.",
  icons: { icon: "/favicon.svg" },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ai-sdk.pro",
    title: "Your agents, one endpoint · ai-sdk.pro",
    description:
      "Tools, streaming, and your infrastructure. Build AI that does more than talk.",
    url: "https://ai-sdk.pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "ai-sdk.pro — Your agents, one endpoint",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
