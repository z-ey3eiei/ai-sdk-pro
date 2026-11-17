import type { Metadata } from "next";
import { Suspense } from "react";
import WorkspaceDeploy from "../../../components/WorkspaceDeploy";
import "../../../components/unified-deploy.css";

export const metadata: Metadata = {
  title: "Deploy | ai-sdk.pro Workspace",
  description: "Import, build and deploy GitHub repositories inside the ai-sdk.pro workspace.",
};

export default function DeployWorkspacePage() {
  return <Suspense fallback={<main className="workspace-shell">Loading Deploy Workspace…</main>}><WorkspaceDeploy /></Suspense>;
}
