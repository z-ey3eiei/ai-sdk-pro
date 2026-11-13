import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...createSeoMetadata({
    title: "AI agent playground · BYOK",
    description:
      "ทดลอง streaming AI agent ด้วย provider key ของคุณเอง คีย์อยู่ใน memory ของ tab และใช้กับคำขอในเซสชันนี้เท่านั้น",
    path: "/chat",
    locale: "th_TH",
    keywords: ["AI agent playground", "BYOK", "แชต AI streaming"],
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
