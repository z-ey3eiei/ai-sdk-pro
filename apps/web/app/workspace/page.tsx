import { Suspense } from "react";
import RepositoryWorkspace from "../../components/RepositoryWorkspace";

function WorkspaceFallback() {
  return (
    <main className="workspace-shell workspace-deploy-fallback">
      <p>กำลังโหลด Workspace…</p>
    </main>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <RepositoryWorkspace />
    </Suspense>
  );
}