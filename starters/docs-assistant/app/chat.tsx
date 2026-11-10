"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useRef, useState, type FormEvent } from "react";

const MAX_KEY_LENGTH = 512;
const printableKey = /^[\x21-\x7e]+$/;

function sourceIdsFromPart(part: unknown) {
  if (!part || typeof part !== "object") return "";
  const value = (part as { output?: unknown }).output;
  if (!value || typeof value !== "object") return "";
  const matches = (value as { matches?: unknown }).matches;
  if (!Array.isArray(matches)) return "";
  const ids = matches.flatMap((match) => {
    if (!match || typeof match !== "object") return [];
    const id = (match as { sourceId?: unknown }).sourceId;
    return typeof id === "string" ? [id] : [];
  });
  return ids.length ? `Sources: ${ids.join(", ")}` : "";
}

export default function Chat() {
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionNote, setConnectionNote] = useState(
    "Add a key, then connect. Connecting does not call OpenAI."
  );
  const [input, setInput] = useState("");
  const activeKey = useRef<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            byok: activeKey.current ? { apiKey: activeKey.current } : undefined,
          },
        }),
      }),
    []
  );

  const {
    messages,
    sendMessage,
    status: chatStatus,
    stop,
    error,
    regenerate,
    setMessages,
    clearError,
  } = useChat({ transport });
  const busy = chatStatus === "submitted" || chatStatus === "streaming";

  function changeKey(value: string) {
    setApiKey(value);
    if (connected) {
      activeKey.current = null;
      setConnected(false);
      setConnectionNote("Key changed. Connect again before sending.");
      stop();
    }
  }

  function connect() {
    const candidate = apiKey.trim();
    if (
      candidate.length < 16 ||
      candidate.length > MAX_KEY_LENGTH ||
      !printableKey.test(candidate)
    ) {
      setConnectionNote("Enter a valid-looking OpenAI key. No provider was contacted.");
      setConnected(false);
      activeKey.current = null;
      return;
    }
    activeKey.current = candidate;
    setConnected(true);
    setConnectionNote("Ready. The key stays in this page and request memory only.");
    clearError();
  }

  function forget() {
    stop();
    activeKey.current = null;
    setConnected(false);
    setApiKey("");
    setConnectionNote("Key forgotten. Nothing was saved or verified.");
    clearError();
  }

  async function send(text: string) {
    const value = text.trim();
    if (!value || !connected || busy) return;
    setInput("");
    clearError();
    await sendMessage({ text: value });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <main className="shell">
      <div className="eyebrow">AI SDK 6 / local knowledge starter</div>
      <h1>Docs Assistant</h1>
      <p className="lede">
        A real UI stream that can search four editable local snippets. It is
        intentionally keyword search in <code>lib/knowledge.ts</code>, not a fake
        vector database or remote RAG service.
      </p>

      <section className="panel" aria-labelledby="key-heading">
        <h2 id="key-heading">OpenAI BYOK</h2>
        <p className="note">
          The masked key is kept in React memory only. This starter never stores
          it in cookies, local storage, URLs, logs, or message parts.
        </p>
        <div className="key-row">
          <input
            className="key-input"
            type="password"
            value={apiKey}
            onChange={(event) => changeKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            aria-label="OpenAI API key"
          />
          <button className="primary" type="button" onClick={connect}>
            Connect in memory
          </button>
          <button className="secondary" type="button" onClick={forget}>
            Forget
          </button>
        </div>
        <p className={`status${connected ? " ready" : ""}`} role="status">
          {connectionNote}
        </p>
      </section>

      <section className="panel" aria-label="Conversation">
        <div className="chat" aria-live="polite">
          {messages.length === 0 && (
            <p className="note">
              Try: “How does useChat send a current BYOK value?” or “Explain the
              local search limitation.”
            </p>
          )}
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <div className="message-meta">{message.role}</div>
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return <span key={index}>{part.text}</span>;
                }
                const sourceNote = sourceIdsFromPart(part);
                return (
                  <div className="tool" key={index}>
                    Tool activity: {part.type}
                    {sourceNote && <div className="sources">{sourceNote}</div>}
                  </div>
                );
              })}
            </article>
          ))}
        </div>
        {error && (
          <div className="error" role="alert">
            The request could not be completed. Check the key and try again.
            <button className="secondary" type="button" onClick={() => void regenerate()}>
              Retry
            </button>
          </div>
        )}
        <form className="composer" onSubmit={submit}>
          <div className="composer-row">
            <textarea
              className="composer-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={connected ? "Ask about the local snippets..." : "Connect a key to start"}
              rows={2}
              maxLength={12000}
              disabled={!connected || busy}
              aria-label="Message"
            />
            {busy ? (
              <button className="stop" type="button" onClick={stop}>
                Stop
              </button>
            ) : (
              <button className="primary" type="submit" disabled={!connected || !input.trim()}>
                Send
              </button>
            )}
          </div>
        </form>
      </section>

      <p className="note">
        Fixed model: <code>gpt-5-mini</code>. Edit <code>lib/knowledge.ts</code> to
        teach the assistant your own public snippets. OpenAI usage is billed to
        the key owner.
      </p>
      <button className="secondary" type="button" onClick={() => setMessages([])}>
        New chat
      </button>
    </main>
  );
}
