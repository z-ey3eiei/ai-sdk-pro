"use client";

import { useState } from "react";

type Action = "markdown" | "agent";
type Feedback = { action: Action; message: string; failed: boolean } | null;

type SelfHostingActionsProps = {
  markdown: string;
  agentPrompt: string;
};

function CopyGlyph({ checked }: { checked: boolean }) {
  return checked ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function SelfHostingActions({
  markdown,
  agentPrompt,
}: SelfHostingActionsProps) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function copyText(action: Action, value: string, label: string) {
    setBusy(action);
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ action, message: `คัดลอก ${label} แล้ว`, failed: false });
    } catch {
      setFeedback({
        action,
        message: "คัดลอกไม่สำเร็จ โปรดตรวจสิทธิ์คลิปบอร์ดของเบราว์เซอร์",
        failed: true,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="docs-action-toolbar">
      <span
        className="docs-action-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback && !feedback.failed ? feedback.message : ""}
      </span>
      <div
        className="docs-action-buttons"
        role="group"
        aria-label="คัดลอกคู่มือ Self-Hosting"
      >
        <button
          className="docs-action-button docs-action-primary"
          type="button"
          onClick={() => void copyText("markdown", markdown, "Markdown")}
          disabled={busy !== null}
          aria-label="คัดลอก Markdown ของคู่มือ Self-Hosting"
        >
          <CopyGlyph
            checked={feedback?.action === "markdown" && !feedback.failed}
          />
          <span>
            {feedback?.action === "markdown" && !feedback.failed
              ? "คัดลอกแล้ว"
              : "คัดลอก Markdown"}
          </span>
        </button>
        <button
          className="docs-action-button docs-action-secondary"
          type="button"
          onClick={() => void copyText("agent", agentPrompt, "Agent Prompt")}
          disabled={busy !== null}
          aria-label="คัดลอก Agent Prompt สำหรับ deploy ไป VPS"
        >
          <CopyGlyph
            checked={feedback?.action === "agent" && !feedback.failed}
          />
          <span>
            {feedback?.action === "agent" && !feedback.failed
              ? "คัดลอกแล้ว"
              : "คัดลอก Agent Prompt"}
          </span>
        </button>
      </div>
      {feedback?.failed ? (
        <span className="docs-action-error" role="alert">
          {feedback.message}
        </span>
      ) : null}
    </div>
  );
}
