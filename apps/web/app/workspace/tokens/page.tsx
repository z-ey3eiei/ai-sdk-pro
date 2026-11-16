"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const endpoint = "/api/platform/tokens";

type TokenRecord = {
  id: string;
  label: string;
  prefix: string;
  scope: string;
  expires_at: string;
};

async function readTokens(signal: AbortSignal): Promise<TokenRecord[]> {
  const response = await fetch(endpoint, { cache: "no-store", signal });
  if (!response.ok) throw new Error(response.status === 401 ? "Sign in to manage API tokens." : "Unable to load API tokens.");
  return (await response.json()).tokens;
}

export default function PlatformTokensPage() {
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [label, setLabel] = useState("");
  const [issued, setIssued] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void readTokens(controller.signal)
      .then(setTokens)
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create token.");
      setIssued(result.token);
      setTokens(current => [result.record, ...current].slice(0, 100));
      setLabel("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create token.");
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this token? Requests using it will fail.")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to revoke token.");
      setTokens(current => current.filter(token => token.id !== id));
      setIssued("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to revoke token.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <Link href="/workspace">Back to workspace</Link>
      <h1 className="text-2xl font-semibold">API tokens</h1>
      <p>Read imported repositories from the API. Tokens expire after 90 days.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={create}>
        <label className="grid gap-1">
          Token name
          <input className="rounded border bg-transparent px-3 py-2" value={label} onChange={event => setLabel(event.target.value)} maxLength={64} required />
        </label>
        <button className="rounded border px-3 py-2" disabled={pending || !label.trim()}>Create token</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {issued && (
        <section className="space-y-2 rounded border p-3">
          <p>Copy your token now. Its full value is shown only once.</p>
          <code className="block break-all select-all">{issued}</code>
          <button onClick={() => setIssued("")}>Hide token</button>
        </section>
      )}
      <ul className="space-y-2">
        {tokens.map(token => (
          <li className="flex flex-wrap items-center justify-between gap-2 rounded border p-3" key={token.id}>
            <span>{token.label} · {token.prefix}… · {token.scope} · expires {new Date(token.expires_at).toLocaleDateString()}</span>
            <button disabled={pending} onClick={() => void revoke(token.id)}>Revoke</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
