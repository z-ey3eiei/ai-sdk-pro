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
import { BrandMark } from "@aisdkpro/ui";
import { APP_VERSION } from "../lib/version";
import ProviderSettings from "./ProviderSettings";
import SiteHeader from "./SiteHeader";
import {
  BYOK_PROVIDERS,
  type BYOKCredentials,
  type BYOKProviderId,
} from "../lib/byok-config";

const suggestions = [
  {
    title: "สร้าง agent ตัวแรก",
    text: "ใช้ searchDocs อธิบายวิธีเริ่ม ToolLoopAgent และเพิ่ม tools สำหรับงานของฉัน",
    detail: "ทำความเข้าใจ agent จากเอกสารในโปรเจกต์",
    icon: Code2,
  },
  {
    title: "Self-host บน VPS",
    text: "ค้นเอกสารและอธิบายวิธี self-host โปรเจกต์นี้ด้วย Docker และ Caddy",
    detail: "ตรวจขั้นตอนบน infrastructure ของคุณเอง",
    icon: Globe2,
  },
  {
    title: "เชื่อม Client SDK",
    text: "ใช้ searchDocs แสดงวิธีเชื่อม React client SDK กับ streaming endpoint",
    detail: "ดู typed client และตัวอย่างการใช้งาน",
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
  return (
    BYOK_PROVIDERS.find(provider => provider.id === id) ?? BYOK_PROVIDERS[0]
  );
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

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (prompt && prompt.length <= 1600) setInput(prompt);
    // Prefill only: never auto-send or accept provider credentials from a URL.
  }, []);

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
    if (!messages.length) return;
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
    invalidateCredentials(
      "Model changed. Save the settings again to enable chat."
    );
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
        message:
          "Enter an API key before connecting. No provider was contacted.",
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
      message:
        "Ready to send · key not yet verified. No provider was contacted.",
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

  const modelLabel = selectedModel?.label ?? "เลือกรุ่นโมเดล";

  return (
    <>
      {showHeader && <SiteHeader active="chat" />}
      <main className="playground">
        <div className="playground-top">
          <div className="playground-title">
            <BrandMark size={18} />
            AI agent playground <span>v{APP_VERSION}</span>
            <span>BYOK</span>
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
              aria-label="เริ่มบทสนทนาใหม่"
            >
              <Plus size={13} aria-hidden="true" />
              เริ่มใหม่
            </button>
          </div>
        </div>
        <section className="chat-guide" aria-labelledby="chat-guide-title">
          <div className="chat-guide-heading">
            <div>
              <span className="chat-guide-kicker">วิธีเริ่มใช้งาน</span>
              <h2 id="chat-guide-title">คุยกับ agent ใน 3 ขั้นตอน</h2>
            </div>
            <span className="chat-guide-badge">BYOK · key อยู่ใน tab นี้</span>
          </div>
          <ol className="chat-guide-steps">
            <li>
              <span>01</span>
              <strong>เลือก provider และ model</strong>
            </li>
            <li>
              <span>02</span>
              <strong>ใส่ key แล้วกด Connect</strong>
            </li>
            <li>
              <span>03</span>
              <strong>ส่งคำถามหรือเลือกตัวอย่าง</strong>
            </li>
          </ol>
          <p>
            Key อยู่ใน memory ของ tab และจะถูกส่งผ่าน HTTPS เมื่อส่งคำขอไปยัง
            ai-sdk.pro และ provider ที่เลือก ไม่บันทึกใน browser storage,
            database, logs หรือข้อความสนทนา ปิด tab หรือกด Forget key
            เพื่อล้างจากหน่วยความจำของหน้านี้
          </p>
        </section>
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
              <h1>วันนี้อยากสร้างอะไร?</h1>
              <p>
                ทดลอง agent ที่ใช้ tools และตอบกลับแบบ streaming
                <br />
                ถามเรื่อง agent, SDK หรือการ self-host โปรเจกต์นี้
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
                            {copied === message.id
                              ? "คัดลอกแล้ว"
                              : "คัดลอกคำตอบ"}
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
              กำลังประมวลผล
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
                Provider ไม่สามารถทำคำขอนี้ให้เสร็จได้ ตรวจ provider, model และ
                key แล้วลองอีกครั้ง
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
                <RotateCcw size={11} aria-hidden="true" /> ลองอีกครั้ง
              </button>
            </div>
          )}
          {!configState.byokEnabled && (
            <div className="chat-error" role="alert">
              <p>Deployment นี้ยังไม่เปิด BYOK จึงยังส่งข้อความไม่ได้</p>
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
                canSend
                  ? "ถามเกี่ยวกับ agent, SDK หรือ self-hosting…"
                  : "เลือก provider และ Connect ก่อนเริ่มสนทนา"
              }
              rows={2}
              aria-label="ข้อความถึง agent"
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
                มี tools 3 รายการ · Shift + Enter เพื่อขึ้นบรรทัดใหม่
              </span>
              {busy ? (
                <button
                  className="send-button"
                  type="button"
                  onClick={() => stop()}
                  aria-label="หยุดการสร้างคำตอบ"
                >
                  <Square size={12} fill="currentColor" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || !canSend}
                  aria-label="ส่งข้อความ"
                >
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
          <p id="composer-note" className="composer-note">
            AI อาจตอบผิด ตรวจสอบข้อมูลสำคัญก่อนนำไปใช้ ·
            บทสนทนาไม่ถูกเก็บบนเซิร์ฟเวอร์
          </p>
        </div>
      </main>
    </>
  );
}
