"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@aisdkpro/ui";

type PreviewEvent = {
  deliveryId: string;
  commit: string;
  status: string;
  receivedAt: string;
  runId: number | null;
};
type PreviewState = {
  configured: boolean;
  dispatchEnabled: boolean;
  events: PreviewEvent[];
};

export default function PreviewDeployment({ repositoryId }: { repositoryId: string }) {
  const [state, setState] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = `/api/repositories/${encodeURIComponent(repositoryId)}/preview`;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal });
    if (!response.ok) throw new Error("Could not load preview events.");
    const result = await response.json() as PreviewState;
    if (!signal?.aborted) setState(result);
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void refresh(controller.signal)
      .catch(() => { if (!controller.signal.aborted) setError("Could not load preview events."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  async function queue() {
    if (pending || !state?.dispatchEnabled) return;
    setPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", cache: "no-store",
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? data.message ?? "Could not request preview.");
      setNotice(data.message ?? "Preview queued.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not queue preview.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="repository-viewer-preview" aria-label="Isolated preview dispatch">
      <h3>Isolated Preview Dispatch</h3>
      <p>Step 1 · Validate the pinned repository snapshot. Step 2 · Queue external preview intake. Step 3 · Review dispatch and isolation status.</p>
      <p>Imported repository code never runs in the Web container. Preview intake is handled by the separate dispatcher.</p>
      {loading ? <p role="status">Loading preview status…</p> : null}
      {!loading && state?.configured === false ? (
        <p>There is no deployment project configured for this repository. No preview was submitted.</p>
      ) : null}
      <button type="button" className="repository-viewer-button repository-viewer-button-primary"
        disabled={pending || !state?.dispatchEnabled} onClick={() => { void queue(); }}>
        {pending ? "Queueing…" : "Request Preview"}
      </button>
      <button type="button" className="repository-viewer-button repository-viewer-button-secondary"
        onClick={() => { setError(""); void refresh().catch(() => setError("Could not refresh preview events.")); }}>
        Refresh events
      </button>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {state?.events.length ? (
        <div className="repository-viewer-preview-table-wrap">
          <table className="repository-viewer-preview-table">
            <thead><tr><th>Created</th><th>Commit</th><th>Status</th><th>Run</th></tr></thead>
            <tbody>
              {state.events.map(item => (
                <tr key={item.deliveryId}>
                  <td>{new Date(item.receivedAt).toLocaleString()}</td>
                  <td><code>{item.commit.slice(0, 8)}</code></td>
                  <td>
                    <StatusBadge status={item.status === "submitted" ? "ready" : item.status === "pending" || item.status === "dispatching" ? "building" : "error"}>
                      {item.status}
                    </StatusBadge>
                  </td>
                  <td>{item.runId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && state?.configured ? <p>No preview events recorded.</p> : null}
    </section>
  );
}
