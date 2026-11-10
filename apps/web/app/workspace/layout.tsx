import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repository workspace",
  description:
    "Review authorized GitHub repositories and bounded read-only snapshots.",
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
