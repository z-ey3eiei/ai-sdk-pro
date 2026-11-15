"use client";

import { useEffect, useState } from "react";

type Deployment = { commit: string | null; branch: string; url: string; workflowUrl: string };

export default function RegistryDeployment({ repositoryId }: { repositoryId: string }) {
  const endpoint = `/api/repositories/${encodeURIComponent(repositoryId)}/registry`;
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error();
        const result: { deployment: Deployment | null } = await response.json();
        if (!controller.signal.aborted) setDeployment(result.deployment);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage("Could not load deployment status.");
      });
    return () => controller.abort();
  }, [endpoint, refresh]);

  async function requestDeployment() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", cache: "no-store" });
      const result = await response.json().catch(() => null);
      setMessage(response.ok ? "GitHub Actions queued the deployment." : result?.error ?? "Could not queue deployment.");
    } catch {
      setMessage("Could not queue deployment.");
    } finally {
      setPending(false);
    }
  }

  if (!deployment) return message ? <span role="status">{message}</span> : null;
  return (
    <div>
      <p>Production · {deployment.branch} · {deployment.commit?.slice(0, 7) ?? "Awaiting first deployment"}</p>
      <button className="repository-viewer-button repository-viewer-button-primary" type="button" onClick={requestDeployment} disabled={pending}>
        {pending ? "Requesting…" : "Deploy"}
      </button>
      <button className="repository-viewer-button repository-viewer-button-secondary" type="button" onClick={() => { setMessage(""); setRefresh(value => value + 1); }}>
        Refresh deployment
      </button>
      <a className="repository-viewer-button repository-viewer-button-secondary" href={deployment.url} target="_blank" rel="noreferrer">Open deployed site</a>
      <a className="repository-viewer-button repository-viewer-button-secondary" href={deployment.workflowUrl} target="_blank" rel="noreferrer">GitHub Actions</a>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
