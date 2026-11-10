"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Code2, Sparkles } from "lucide-react";
import { BrandMark, CodeBlock } from "@aisdkpro/ui";

const tools = {
  getCurrentTime: {
    label: "Time",
    lines: [
      "tool: getCurrentTime",
      'input: { timeZone: "Asia/Bangkok" }',
      "output: ISO timestamp + localized time",
    ],
  },
  searchDocs: {
    label: "Docs",
    lines: [
      "tool: searchDocs",
      'input: { query: "self-hosting" }',
      "output: matching documentation + links",
    ],
  },
  fetchUrl: {
    label: "Fetch",
    lines: [
      "tool: fetchUrl",
      'input: { url: "https://ai-sdk.dev/docs" }',
      "policy: approved HTTPS hosts only",
    ],
  },
};
export function ToolsDemo() {
  const [selected, setSelected] =
    useState<keyof typeof tools>("getCurrentTime");
  return (
    <div className="tool-design-demo">
      <div
        className="demo-chips"
        role="tablist"
        aria-label="Explore agent tools"
      >
        {Object.entries(tools).map(([name, tool]) => (
          <button
            role="tab"
            aria-selected={selected === name}
            onClick={() => setSelected(name as keyof typeof tools)}
            key={name}
          >
            {tool.label}
          </button>
        ))}
        <span>AI SDK 6</span>
        <span>TypeScript</span>
      </div>
      <div
        className="tool-design-output"
        role="tabpanel"
        aria-label={tools[selected].label}
      >
        {tools[selected].lines.map(line => (
          <p key={line}>
            <Check size={12} />
            {line}
          </p>
        ))}
      </div>
      <div className="demo-fineprint">
        <span>Tool input / output examples</span>
        <span>20-step maximum</span>
      </div>
    </div>
  );
}
export function SDKDemo() {
  const [mode, setMode] = useState("react");
  const code =
    mode === "react"
      ? `import { useAISDKProChat } from '@aisdkpro/client/react';\n\nconst { messages, sendMessage, stop } =\n  useAISDKProChat({ endpoint: '/api/chat' });\n\nsendMessage({ text: 'What can we build?' });`
      : `import { ChatClient } from '@aisdkpro/client';\n\nconst client = new ChatClient({ endpoint: '/api/chat' });\nfor await (const event of client.stream(messages)) {\n  if (event.type === 'text-delta') render(event.delta);\n}`;
  return (
    <div className="sdk-design-demo">
      <div className="sdk-demo-heading">
        <span>
          <Code2 size={14} /> @aisdkpro/client
        </span>
        <div role="tablist" aria-label="Choose SDK example">
          <button
            role="tab"
            aria-selected={mode === "react"}
            onClick={() => setMode("react")}
          >
            React
          </button>
          <button
            role="tab"
            aria-selected={mode === "core"}
            onClick={() => setMode("core")}
          >
            Core
          </button>
        </div>
      </div>
      <CodeBlock
        code={code}
        filename={mode === "react" ? "chat.tsx" : "client.ts"}
      />
      <div className="sdk-demo-events">
        <span>UI message stream · example</span>
        <code>
          <span>data:</span> {`{"type":"text-delta","delta":"Hello"}`}
        </code>
      </div>
      <div className="demo-fineprint">
        <span>Typed events</span>
        <span>AbortSignal</span>
        <span>No browser keys</span>
      </div>
    </div>
  );
}
export function StreamDemo() {
  return (
    <div className="stream-design-demo">
      <div className="stream-demo-bar">
        <span>
          <BrandMark size={14} /> ai-sdk.pro
        </span>
        <span>UI preview</span>
      </div>
      <div className="stream-demo-body">
        <div className="mini-user-message">What can my agent do?</div>
        <div className="mini-agent-message">
          <Sparkles size={15} />
          <p>
            Your agent can search the docs, read approved documentation, and use
            tools.
            <span className="mini-cursor" />
          </p>
        </div>
        <div className="mini-tool-state">
          <Check size={12} /> searchDocs <span>Tool-enabled streaming</span>
        </div>
      </div>
      <div className="stream-demo-footer">
        <span>Example interface · no request running</span>
        <Link href="/chat">
          Try live <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
export default function PlatformDemos() {
  return (
    <section className="platform-design-rows">
      <div className="reference-container">
        <div className="platform-design-row">
          <div>
            <p className="section-eyebrow">TOOL-ENABLED INTELLIGENCE</p>
            <h3>Create more, configure less.</h3>
            <p>
              Give your agent a clear objective and real tools. Let it search
              your docs, find the facts, and stream an answer — while your
              server keeps control of every step.
            </p>
            <Link href="/docs/defining-agents">
              Define your first agent <ArrowRight size={13} />
            </Link>
          </div>
          <div className="platform-design-media">
            <ToolsDemo />
          </div>
        </div>
        <div className="platform-design-row reversed">
          <div>
            <p className="section-eyebrow">TYPE-SAFE SDK</p>
            <h3>Connect your app in minutes.</h3>
            <p>
              A small client. A typed stream. Use your own interface, connect it
              to one endpoint, and build with full autocomplete. Provider keys
              never leave the server.
            </p>
            <Link href="/docs/client-sdk">
              Explore the client SDK <ArrowRight size={13} />
            </Link>
          </div>
          <div className="platform-design-media">
            <SDKDemo />
          </div>
        </div>
        <div className="platform-design-row">
          <div>
            <p className="section-eyebrow">REAL-TIME RESPONSES</p>
            <h3>From thought to conversation.</h3>
            <p>
              See the answer as it arrives and the tools as they work. The
              playground connects to a real agent with stop, retry, and new
              conversation controls.
            </p>
            <Link href="/chat">
              Open the playground <ArrowRight size={13} />
            </Link>
          </div>
          <div className="platform-design-media">
            <StreamDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
