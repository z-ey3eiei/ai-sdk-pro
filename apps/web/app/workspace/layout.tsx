import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace | ai-sdk.pro",
  description:
    "One platform account for chat, storage, repositories and deployments.",
  alternates: { canonical: "/workspace" },
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
