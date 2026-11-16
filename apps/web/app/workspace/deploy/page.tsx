import { Suspense } from "react";
import WorkspaceDeployView from "../../../components/WorkspaceDeployView";

export const metadata = {
  title: "Deploy projects",
  description:
    "Import a snapshot in Workspace, then publish the same GitHub repository through the Cloudflare deploy pilot.",
};

function DeployFallback() {
  return (
    <main className="workspace-shell workspace-deploy-fallback">
      <p>กำลังโหลดแผง Deploy…</p>
    </main>
  );
}

export default function WorkspaceDeployPage() {
  return (
    <Suspense fallback={<DeployFallback />}>
      <WorkspaceDeployView />
    </Suspense>
  );
}