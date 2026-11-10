import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Agent playground",
  description:
    "Try a tool-enabled agent with real streaming responses. Explore the SDK and self-hosting documentation.",
  alternates: { canonical: "/chat" },
  robots: { index: false, follow: true },
};
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
