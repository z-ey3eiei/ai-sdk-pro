"use client";

import Link from "next/link";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Streamdown } from "streamdown";

type TokenResponse = { token: string; userId: string; threadId: string; expiresAt: string };
type Quota = { used: number; remaining: number; remainingBudgetMicros: number };

const THREAD_STORAGE = "aisdkpro:edge-thread-id";
const INPUT_LIMIT = 4000;

function isTokenResponse(value: unknown): value is TokenResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<TokenResponse>;
  return typeof candidate.token === "string" &&
    typeof candidate.userId === "string" && candidate.userId.length > 0 &&
    typeof candidate.threadId === "string" &&
    typeof candidate.expiresAt === "string";
}

function newThreadId(): string {
  return crypto.randomUUID();
}

async function issueToken(threadId: string): Promise<TokenResponse> {
  const response = await fetch("/api/chat/session-token", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ threadId }),
  });
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "Your sign-in has expired. Sign in again."
      : response.status === 503
        ? "Cloudflare Keyless chat is not configured."
        : "Could not authorize your chat session.");
  }
  const result: unknown = await response.json();
  if (!isTokenResponse(result)) throw new Error("Invalid chat session response.");
  return result;
}

function EdgeConversation({
  host,
  session,
  threadId,
  onNewThread,
}: {
  host: string;
  session: TokenResponse;
  threadId: string;
  onNewThread: () => void;
}) {
  const [input, setInput] = useState("");
  const [messageError, setMessageError] = useState("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const submitting = useRef(false);
  const requestToken = useCallback(() => issueToken(threadId), [threadId]);

  const agent = useAgent({
    agent: "ChatAgent",
    name: `${session.userId}:${threadId}`,
    host,
    query: async () => ({ token: (await requestToken()).token }),
    queryDeps: [session.userId, threadId],
    cacheTtl: 30_000,
  });

  const { messages, sendMessage, status, stop, clearHistory, isServerStreaming } = useAgentChat({
    agent,
    resume: true,
    prepareSendMessagesRequest: async () => ({
      body: { token: (await requestToken()).token },
    }),
  });

  const refreshQuota = useCallback(async () => {
    try {
      const issued = await requestToken();
      const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http:" : "https:";
      const res = await fetch(`${protocol}//${host}/usage`, {
        headers: { Authorization: `Bearer ${issued.token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const result: unknown = await res.json();
      if (result && typeof result === "object" && "remaining" in result) {
        const data = result as Partial<Quota>;
        if (typeof data.remaining === "number" && typeof data.used === "number" &&
            typeof data.remainingBudgetMicros === "number") setQuota(data as Quota);
      }
    } catch {
      // Usage telemetry must not block the chat experience.
    }
  }, [host, requestToken]);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  const busy = status === "submitted" || status === "streaming" || isServerStreaming;

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || busy || submitting.current || (quota && quota.remaining <= 0)) return;
    submitting.current = true;
    setMessageError("");
    try {
      await sendMessage({ text: input.trim() });
      setInput("");
      void refreshQuota();
    } catch {
      setMessageError("Message could not be sent. Please retry.");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <section className="edge-chat" aria-label="Cloudflare Keyless Chat">
      <div className="edge-chat-toolbar">
        <span>Cloudflare Edge · GLM-4.7-Flash <strong>Keyless</strong></span>
        <div>
          <span className="edge-chat-quota" aria-live="polite">
            {quota ? `${quota.remaining}/30 questions remaining today` : "Checking daily quota…"}
          </span>
          <button type="button" onClick={onNewThread}>New thread</button>
          <button type="button" onClick={() => { void clearHistory(); setMessageError(""); }} disabled={busy}>Clear history</button>
        </div>
      </div>
      <div className="edge-chat-transcript" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <div className="edge-chat-empty">
            <h2>Ask the edge agent</h2>
            <p>History is stored in this user's Cloudflare Durable Object. Reconnect to the same thread to continue.</p>
          </div>
        ) : messages.map(message => (
          <article className="edge-chat-message" data-role={message.role} key={message.id}>
            <p className="edge-chat-role">{message.role === "user" ? "You" : "GLM-4.7-Flash"}</p>
            {message.parts.map((part, i) => part.type === "text"
              ? <Streamdown key={i}>{part.text}</Streamdown>
              : null)}
          </article>
        ))}
        {busy ? <p className="edge-chat-working">Generating response…</p> : null}
      </div>
      {messageError ? <p className="edge-chat-error" role="alert">{messageError}</p> : null}
      <form className="edge-chat-form" onSubmit={event => { void send(event); }}>
        <label htmlFor="edge-chat-message">Message</label>
        <textarea
          id="edge-chat-message"
          value={input}
          onChange={event => setInput(event.target.value)}
          maxLength={INPUT_LIMIT}
          rows={3}
          placeholder="What would you like to build?"
          disabled={quota?.remaining === 0}
        />
        <div className="edge-chat-form-actions">
          <span>{input.length}/{INPUT_LIMIT}</span>
          {busy
            ? <button type="button" onClick={() => stop()}>Stop</button>
            : <button type="submit" disabled={!input.trim() || quota?.remaining === 0}>Send</button>}
        </div>
      </form>
    </section>
  );
}

export default function KeylessChat() {
  const [threadId, setThreadId] = useState("");
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");
  const hostValue = process.env.NEXT_PUBLIC_CF_AGENT_URL;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THREAD_STORAGE);
      setThreadId(stored && /^[a-z0-9_-]{1,64}$/i.test(stored) ? stored : newThreadId());
    } catch {
      setThreadId(newThreadId());
    }
  }, []);

  useEffect(() => {
    if (!threadId) return;
    let active = true;
    setSession(null);
    setError("");
    void issueToken(threadId)
      .then(value => { if (active) setSession(value); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to establish chat session.");
      });
    return () => { active = false; };
  }, [threadId]);

  function newThread() {
    const id = newThreadId();
    try { window.localStorage.setItem(THREAD_STORAGE, id); } catch { /* optional thread metadata */ }
    setThreadId(id);
  }

  if (!hostValue || !/^https?:\/\//.test(hostValue)) {
    return <p className="edge-chat-error">Keyless chat is not configured. Select BYOK mode.</p>;
  }
  const host = new URL(hostValue).host;
  if (error) return (
    <div className="edge-chat-empty" role="alert">
      <p>{error}</p>
      <Link href="/login">Sign in</Link>
      <button type="button" onClick={() => setThreadId(newThreadId())}>Retry with a new thread</button>
    </div>
  );
  if (!session) return <div className="edge-chat-empty" role="status">Authorizing Edge chat…</div>;

  return <EdgeConversation key={threadId} host={host} session={session} threadId={threadId} onNewThread={newThread} />;
}
