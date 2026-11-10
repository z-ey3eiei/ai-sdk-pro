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
import ProviderSettings from "./ProviderSettings";
import {
  BYOK_PROVIDERS,
  type BYOKCredentials,
  type BYOKProviderId,
} from "../lib/byok-config";

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

type ConnectionTone = "neutral" | "ready" | "warning";
type ConnectionStatus = {
  tone: ConnectionTone;
  message: string;
};

type ConfigState = {
  loaded: boolean;
  byokEnabled: boolean;
  byokRequired: boolean;
  error: boolean;
};

function providerFor(id: BYOKProviderId) {
  return BYOK_PROVIDERS.find(provider => provider.id === id) ?? BYOK_PROVIDERS[0];
}

function isValidCredentials(
  credentials: BYOKCredentials | null
): credentials is BYOKCredentials {
  if (!credentials?.apiKey.trim()) return false;
  const provider = providerFor(credentials.provider);
  return provider.models.some(model => model.id === credentials.model);
}

export default function LLMChat({
  api = "/api/chat",
  configApi = "/api/config",
  showHeader = true,
}: LLMChatProps = {}) {
  const initialProvider = BYOK_PROVIDERS[0];
  const [provider, setProvider] = useState<BYOKProviderId>(initialProvider.id);
  const [model, setModel] = useState<string>(initialProvider.models[0].id);
  const [apiKey, setApiKey] = useState("");
  const [activeCredentials, setActiveCredentials] =
    useState<BYOKCredentials | null>(null);
  const [connectAttempted, setConnectAttempted] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);
  const [configState, setConfigState] = useState<ConfigState>({
    loaded: false,
    byokEnabled: true,
    byokRequired: true,
    error: false,
  });
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const credentialsRef = useRef<BYOKCredentials | null>(null);

  // This transport is intentionally stable. The ref is read for every send and
  // regeneration, so retries cannot capture an old provider key or model.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api,
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...(body ?? {}),
            messages,
            byok: credentialsRef.current,
          },
        }),
      }),
    [api]
  );
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

  const busy = status === "submitted" || status === "streaming";
  const selectedProvider = providerFor(provider);
  const selectedModel = selectedProvider.models.find(item => item.id === model);
  const draftIsValid = Boolean(apiKey.trim() && selectedModel);
  const canSend =
    configState.byokEnabled && isValidCredentials(activeCredentials);

  useEffect(() => {
    let disposed = false;
    setConfigState(current => ({ ...current, loaded: false, error: false }));

    fetch(configApi, { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("config-unavailable");
        return response.json() as Promise<{
          byokEnabled?: boolean;
          byokRequired?: boolean;
        }>;
      })
      .then(data => {
        if (disposed) return;
        setConfigState({
          loaded: true,
          byokEnabled: data.byokEnabled !== false,
          byokRequired: data.byokRequired !== false,
          error: false,
        });
      })
      .catch(() => {
        if (disposed) return;
        // Safe defaults keep the UI BYOK-only and never surface a network body.
        setConfigState({
          loaded: true,
          byokEnabled: true,
          byokRequired: true,
          error: true,
        });
      });

    return () => {
      disposed = true;
    };
  }, [configApi]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function invalidateCredentials(
    message: string,
    tone: ConnectionTone = "neutral",
    clearKey = false
  ) {
    stop();
    credentialsRef.current = null;
    setActiveCredentials(null);
    if (clearKey) setApiKey("");
    setConnectAttempted(false);
    setConnectionStatus({ tone, message });
    clearError();
  }

  function handleProviderChange(nextProvider: BYOKProviderId) {
    if (nextProvider === provider) return;
    const next = providerFor(nextProvider);
    invalidateCredentials(
      "Provider changed. Add a new key and connect again.",
      "neutral",
      true
    );
    setProvider(next.id);
    setModel(next.models[0].id);
  }

  function handleModelChange(nextModel: string) {
    if (nextModel === model) return;
    invalidateCredentials("Model changed. Save the settings again to enable chat.");
    setModel(nextModel);
  }

  function handleApiKeyChange(nextKey: string) {
    if (credentialsRef.current) {
      invalidateCredentials(
        "Key changed. Connect again before sending.",
        "neutral"
      );
    } else {
      setConnectionStatus(
        nextKey.trim()
          ? {
              tone: "neutral",
              message: "Key entered. Connect to enable chat.",
            }
          : null
      );
      setConnectAttempted(false);
      clearError();
    }
    setApiKey(nextKey);
  }

  function connectInMemory() {
    setConnectAttempted(true);
    if (!draftIsValid) {
      setConnectionStatus({
        tone: "warning",
        message: "Enter an API key before connecting. No provider was contacted.",
      });
      return;
    }

    const nextCredentials: BYOKCredentials = {
      provider,
      model,
      apiKey: apiKey.trim(),
    };
    credentialsRef.current = nextCredentials;
    setActiveCredentials(nextCredentials);
    setApiKey(nextCredentials.apiKey);
    setConnectionStatus({
      tone: "ready",
      message: "Ready to send · key not yet verified. No provider was contacted.",
    });
    clearError();
  }

  function forgetKey() {
    invalidateCredentials(
      "Key forgotten from this tab's memory. Nothing was verified.",
      "neutral",
      true
    );
  }

  async function send(text: string) {
    if (!text.trim() || busy || !canSend) return;
    clearError();
    setInput("");
    await sendMessage({ text: text.trim() });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
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

  const modelLabel = selectedModel?.label ?? "Choose a model";

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
              {activeCredentials?.model ?? modelLabel}
            </span>
            <button
              className="new-chat"
              type="button"
              onClick={() => {
                stop();
                setMessages([]);
                clearError();
                setInput("");
              }}
              aria-label="Start a new chat"
            >
              <Plus size={13} aria-hidden="true" />
              New chat
            </button>
          </div>
        </div>
        <div className="chat-content">
          <ProviderSettings
            provider={provider}
            model={model}
            apiKey={apiKey}
            activeCredentials={activeCredentials}
            byokEnabled={configState.byokEnabled}
            byokRequired={configState.byokRequired}
            configLoading={!configState.loaded}
            configError={configState.error}
            connectAttempted={connectAttempted}
            connectionStatus={connectionStatus}
            onProviderChange={handleProviderChange}
            onModelChange={handleModelChange}
            onApiKeyChange={handleApiKeyChange}
            onConnect={connectInMemory}
            onForget={forgetKey}
          />
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
                    type="button"
                    onClick={() => void send(s.text)}
                    disabled={busy || !canSend}
                  >
                    <s.icon size={17} aria-hidden="true" />
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
                            type="button"
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
            <div className="thinking" role="status" aria-live="polite">
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
                The provider could not complete this request. Check the selected
                provider, model, and key, then retry.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!canSend) return;
                  clearError();
                  void regenerate();
                }}
                disabled={busy || !canSend}
              >
                <RotateCcw size={11} aria-hidden="true" /> Retry
              </button>
            </div>
          )}
          {!configState.byokEnabled && (
            <div className="chat-error" role="alert">
              <p>BYOK is not enabled for this deployment, so chat is unavailable.</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="composer-wrap">
          <form className="composer" onSubmit={submit}>
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder={
                canSend ? "Ask something. Build something." : "Connect a provider to start chatting."
              }
              rows={2}
              aria-label="Message to the agent"
              aria-describedby="composer-note"
              onKeyDown={event => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
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
                  <Square size={12} fill="currentColor" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || !canSend}
                  aria-label="Send message"
                >
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
          <p id="composer-note" className="composer-note">
            AI can make mistakes. Verify important details. Chat is not stored
            on our server.
          </p>
        </div>
      </main>
    </>
  );
}
