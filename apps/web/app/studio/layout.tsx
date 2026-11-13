import type { Metadata } from "next";
import StudioShell from "../../components/studio/StudioShell";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Studio",
};
export default function StudioLayout() {
  return <StudioShell />;
}
