
import type { Metadata } from "next";
import WorkspaceStorage from "../../../components/WorkspaceStorage";
import "../../../components/workspace-storage.css";

export const metadata: Metadata = {
  title: "Private Storage | ai-sdk.pro Workspace",
  description: "Manage private user files with optional Vercel Blob storage.",
};

export default function StoragePage() {
  return <WorkspaceStorage />;
}
