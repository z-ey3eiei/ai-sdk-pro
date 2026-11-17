import type { Metadata } from "next";
import WorkspaceBlobStorage from "../../../components/WorkspaceBlobStorage";
import "../../../components/workspace-storage.css";

export const metadata: Metadata = {
  title: "Private Storage | ai-sdk.pro Workspace",
  description: "Private Vercel Blob file storage in the authenticated ai-sdk.pro workspace.",
};

export default function WorkspaceStoragePage() {
  return <WorkspaceBlobStorage />;
}
