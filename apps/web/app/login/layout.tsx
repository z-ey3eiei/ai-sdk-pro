import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in or register",
  description:
    "Register directly with ai-sdk.pro, then connect GitHub for repositories and deployments.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
