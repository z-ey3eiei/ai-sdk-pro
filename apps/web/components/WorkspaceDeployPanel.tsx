"use client";

import { useEffect, useState } from "react";
import DeployEmbed from "./DeployEmbed";

export default function WorkspaceDeployPanel({
  repoHint,
}: {
  repoHint?: string | null;
}) {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/deploy/health", { signal: controller.signal, cache: "no-store" })
      .then(response => (response.ok ? response.json() : { ready: false }))
      .then((body: { ready?: boolean }) => {
        if (!controller.signal.aborted) setReady(Boolean(body.ready));
      })
      .catch(() => {
        if (!controller.signal.aborted) setReady(false);
      });
    return () => controller.abort();
  }, []);

  if (ready === null) {
    return (
      <section className="workspace-deploy-loading" aria-live="polite">
        <p>กำลังเช็คสถานะแผง Deploy…</p>
      </section>
    );
  }

  return <DeployEmbed ready={ready} variant="workspace" repoHint={repoHint} />;
}