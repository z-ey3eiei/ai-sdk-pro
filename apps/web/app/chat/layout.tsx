import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...createSeoMetadata({
    title: "AI agent playground",
    description:
      "Try a streaming AI agent with real tools using your own provider key. Explore the BYOK playground, typed messages, cancellation, and self-hosting guides.",
    path: "/chat",
    keywords: ["AI agent playground", "BYOK AI chat", "streaming AI chat"],
  }),
  robots: { index: false, follow: true },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
