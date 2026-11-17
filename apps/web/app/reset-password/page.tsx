
import type { Metadata } from "next";
import ResetPasswordPanel from "../../components/ResetPasswordPanel";

export const metadata: Metadata = {
  title: "Reset password | ai-sdk.pro",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function ResetPasswordPage() {
  return <ResetPasswordPanel />;
}
