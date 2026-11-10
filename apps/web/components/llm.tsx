"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowUp,
  Check,
  CircleCheck,
  Code2,
  Copy,
  FileText,
  Globe2,
  Loader2,
  Plus,
  RotateCcw,
  Square,
  Wrench,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { BrandMark, Header } from "@aisdkpro/ui";
import { APP_VERSION } from "../lib/version";

const suggestions = [
  {
    title: "Build my first agent",
    text: "Use searchDocs to explain how I can define my first ToolLoopAgent with tools.",
    detail: "Learn the fundamentals with local docs.",
    icon: Code2,
  },
  {
    title: "Deploy on my VPS",
    text: "Search the docs and explain how I can self-host this project with Docker and Caddy.",
    detail: "Your infrastructure. Your rules.",
    icon: Globe2,
  },
  {
    title: "Explore the SDK",
    text: "Use searchDocs to show how the React client SDK connects to the streaming endpoint.",
    detail: "Connect your own app in a few lines.",
    icon: FileText,
  },
];
export interface LLMChatProps {
  /** Your server UIMessage SSE endpoint; never a provider URL or API key. */
  api?: string;
  /** Public model/config labels only, not credentials. */
  configApi?: string;
  showHeader?: boolean;
}

export default function LLMChat({
  api = "/api/chat",
  configApi = "/api/config",
  showHeader = true,
}: LLMChatProps = {}) {
  const transport = useMemo(() => new DefaultChatTransport({ api }), [api]);
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    setMessages,
    clearError,
  } = useChat({ transport });
  const [input, setInput] = useState("");
  const [model, setModel] = useState("Loading model…");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    fetch(configApi)
      .then(r => r.json())
      .then((data: { model: string; configured: boolean }) => {
        setModel(data.model);
        setConfigured(data.configured);
      })
      .catch(() => setModel("Provider unavailable"));
  }, [configApi]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);
  async function send(text: string) {
    if (!text.trim() || busy) return;
    clearError();
    setInput("");
    await sendMessage({ text: text.trim() });
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  async function copyMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }
  return (
    <>
      {showHeader && <Header active="chat" />}
      <main className="playground">
        <div className="playground-top">
          <div className="playground-title">
            <BrandMark size={18} />
            Agent playground <span>v{APP_VERSION}</span>
            <span>LIVE</span>
          </div>
          <div className="playground-actions">
            <span className="model-tag">
              <i />
              {model}
            </span>
            <button
              className="new-chat"
              onClick={() => {
                stop();
                setMessages([]);
                clearError();
                setInput("");
              }}
            >
              <Plus size={13} />
              New chat
            </button>
          </div>
        </div>
        <div className="chat-content">
          {!messages.length ? (
            <section className="chat-welcome">
              <span className="welcome-mark">
                <BrandMark size={33} />
              </span>
              <h1>What will you build?</h1>
              <p>
                One agent. Real tools. A world of possibilities.
                <br />
                Ask about agents, your SDK, or self-hosting.
              </p>
              <div className="suggestions">
                {suggestions.map(s => (
                  <button
                    key={s.title}
                    onClick={() => void send(s.text)}
                    disabled={busy}
                  >
                    <s.icon size={17} />
                    <strong>{s.title}</strong>
                    <span>{s.detail}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="messages">
              {messages.map(message => {
                const text = message.parts
                  .filter(p => p.type === "text")
                  .map(p => p.text)
                  .join("");
                return (
                  <article
                    key={message.id}
                    className={`chat-message ${message.role}`}
                  >
                    {message.role === "user" ? (
                      <div className="user-bubble">{text}</div>
                    ) : (
                      <div>
                        <div className="assistant-label">
                          <BrandMark size={18} />
                          ai-sdk.pro
                        </div>
                        {message.parts.map((part, index) => {
                          if (part.type === "text")
                            return (
                              <div className="assistant-body" key={index}>
                                <Streamdown>{part.text}</Streamdown>
                              </div>
                            );
                          if (isToolUIPart(part)) {
                            const done = part.state === "output-available";
                            const failed = part.state === "output-error";
                            return (
                              <div className="tool-activity" key={index}>
                                {done ? (
                                  <CircleCheck size={12} />
                                ) : failed ? (
                                  <Wrench size={12} />
                                ) : (
                                  <Loader2 size={12} className="spin" />
                                )}
                                <span>{getToolName(part)}</span>
                                <span>
                                  {done
                                    ? "Complete"
                                    : failed
                                      ? "Failed"
                                      : "Working…"}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })}
                        {text && (
                          <button
                            className="message-copy"
                            onClick={() => void copyMessage(message.id, text)}
                          >
                            {copied === message.id ? (
                              <Check size={11} />
                            ) : (
                              <Copy size={11} />
                            )}
                            {copied === message.id ? "Copied" : "Copy response"}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {status === "submitted" && (
            <div className="thinking">
              <BrandMark size={15} />
              Thinking
              <span>
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
          {error && (
            <div className="chat-error" role="alert">
              <p>
                {error.message.includes("{")
                  ? "The provider could not complete this request. Check server configuration or retry."
                  : error.message}
              </p>
              <button
                onClick={() => {
                  clearError();
                  void regenerate();
                }}
                disabled={busy}
              >
                <RotateCcw size={11} /> Retry
              </button>
            </div>
          )}
          {configured === false && (
            <div className="chat-error">
              <p>
                The AI provider is not configured yet. Set your model
                credentials on the server to enable chat. Your keys never belong
                in the browser.
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="composer-wrap">
          <form className="composer" onSubmit={submit}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask something. Build something."
              rows={2}
              aria-label="Message to the agent"
              onKeyDown={e => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <div className="composer-controls">
              <span className="composer-hint">
                3 tools available · Shift + Enter for a new line
              </span>
              {busy ? (
                <button
                  className="send-button"
                  type="button"
                  onClick={() => stop()}
                  aria-label="Stop generation"
                >
                  <Square size={12} fill="currentColor" />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || configured === false}
                  aria-label="Send message"
                >
                  <ArrowUp size={17} />
                </button>
              )}
            </div>
          </form>
          <p className="composer-note">
            AI can make mistakes. Verify important details. Chat is not stored
            on our server.
          </p>
        </div>
      </main>
    </>
  );
}
