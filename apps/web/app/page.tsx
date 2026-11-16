// Adapted layout from the user's Apache-2.0 licensed reference repository.
// Modified for ai-sdk.pro: independent branding, real agent/SDK docs, and portable VPS deployment.
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  FolderOpen,
  GitBranch,
  Globe2,
  Layers3,
  Terminal,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import {
  ButtonLink,
  CodeBlock,
  Footer,
} from "@aisdkpro/ui";
import PlatformDemos from "../components/PlatformDemos";
import SiteHeader from "../components/SiteHeader";
import HomeFAQ from "../components/HomeFAQ";
import HomeHeroInteractive from "../components/HomeHeroInteractive";
import {
  createSeoMetadata,
  HOME_PAGE_TITLE,
  SITE_DESCRIPTION,
} from "../lib/seo-metadata";

export const metadata: Metadata = {
  ...createSeoMetadata({
    title: HOME_PAGE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
    keywords: [
      "AI agent platform",
      "AI SDK 6",
      "streaming AI agents",
      "self-hosted AI",
      "tool-calling agents",
    ],
  }),
  title: `${HOME_PAGE_TITLE} | ai-sdk.pro`,
};

const features = [
  {
    icon: Terminal,
    title: "One endpoint to begin",
    description:
      "Connect your interface to /api/chat. Send a message and receive a typed AI SDK UI stream.",
    href: "/docs/getting-started",
  },
  {
    icon: Wrench,
    title: "Agents that take action",
    description:
      "Give your agent real tools, a clear objective, and a bounded loop. Start with searchDocs, fetchUrl, and getCurrentTime.",
    href: "/docs/defining-agents",
  },
  {
    icon: Zap,
    title: "Every token. In real time.",
    description:
      "Stream responses and tool activity as they happen. Stop a generation or retry when something goes wrong.",
    href: "/chat",
  },
  {
    icon: FolderOpen,
    title: "A clear project structure",
    description:
      "Web, docs, UI, and client SDK in one pnpm workspace. Share the pieces without tangling the responsibilities.",
    href: "/docs/architecture",
  },
  {
    icon: Code2,
    title: "A small, typed client",
    description:
      "Use a framework-agnostic client or a lightweight React hook. Bring your own key without storing it.",
    href: "/docs/client-sdk",
  },
  {
    icon: Upload,
    title: "Choose your infrastructure",
    description:
      "Run the standalone app on your VPS with Docker and Caddy. Build, deploy, and roll back from Git.",
    href: "/docs/self-hosting",
  },
];
const steps = [
  {
    title: "Start the workspace",
    text: "Use Node.js 22 and pnpm 10.18.0. Install the workspace dependencies and open the development server.",
    filename: "terminal",
    code: "pnpm install\npnpm dev",
  },
  {
    title: "Configure your agent",
    text: "Let visitors choose their provider and bring their own key. Keep agent logic and safe, validated tools on the server.",
    filename: "assistant-agent.ts",
    code: `const agent = new ToolLoopAgent({\n  model: provider(process.env.AI_MODEL),\n  instructions: 'Make useful things happen.',\n  tools: { searchDocs, fetchUrl, getCurrentTime },\n  stopWhen: stepCountIs(20),\n});`,
  },
  {
    title: "Connect your interface",
    text: "Keep your UI yours. Use the typed React hook to send messages, render streaming parts, and cancel a run.",
    filename: "chat.tsx",
    code: `import { useAISDKProChat } from '@aisdkpro/client/react';\n\nconst { messages, sendMessage, stop } =\n  useAISDKProChat({ endpoint: '/api/chat' });\n\nsendMessage({ text: 'What can we build?' });`,
  },
];
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="reference-main">
        <section className="center-hero">
          <div className="hero-grid" aria-hidden="true" />
          <div className="reference-container hero-inner">
            <Link href="/docs/defining-agents" className="intro-pill">
              <i aria-hidden="true" /> AI agents · Your infrastructure
            </Link>
            <h1>
              Ideas, meet <span>Intelligence.</span>
            </h1>
            <p>
              ai-sdk.pro gives your ideas the whole stack — tool-enabled agents,
              real-time streaming, and your own infrastructure — so the moment
              of inspiration becomes something useful.
            </p>
            <HomeHeroInteractive />
            <div className="hero-terminal">
              <CodeBlock
                filename="~/ai-sdk.pro"
                language="bash"
                code={
                  "$ pnpm agent:smoke\n✓ Tool executed          getCurrentTime\n✓ Agent loop             20-step limit"
                }
              />
              <span className="terminal-example-label">
                Example output · run in your workspace
              </span>
            </div>
          </div>
        </section>
        <section className="tech-strip">
          <p>BUILT ON TOOLS YOU KNOW.</p>
          <div>
            {[
              "AI SDK",
              "Next.js",
              "TypeScript",
              "React",
              "Fumadocs",
              "Liveblocks",
              "Docker",
              "Caddy",
              "Node.js",
            ].map(name => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </section>
        <PlatformDemos />
        <section className="reference-features" id="features">
          <div className="reference-container">
            <span className="section-eyebrow">SMALL START. ROOM TO BUILD.</span>
            <h2>Everything in its right place.</h2>
            <p className="section-intro">
              A focused foundation for your agents, with a familiar workflow
              <br className="desktop-break" /> from the first prompt to your own
              production server.
            </p>
            <div className="bordered-feature-grid">
              {features.map(({ icon: Icon, title, description, href }) => (
                <Link key={title} href={href}>
                  <Icon size={25} />
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="feature-read">
                    Explore <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="reference-start" id="get-started">
          <div className="reference-container start-layout">
            <div className="start-copy">
              <span className="section-eyebrow">FROM PROMPT TO PRODUCTION</span>
              <h2>
                Get started.
                <br />
                <span>Keep creating.</span>
              </h2>
              <p>
                Three steps to your first working agent. Your code is the
                workspace; your infrastructure is where it lives.
              </p>
              <Link href="/docs/getting-started">
                Read the setup guide <ArrowRight size={15} />
              </Link>
            </div>
            <ol className="start-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="step-number">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                    <CodeBlock
                      code={step.code}
                      filename={step.filename}
                      language={index === 0 ? "bash" : "typescript"}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="reference-deploy" id="deploy">
          <div className="reference-container deploy-layout">
            <div>
              <span className="section-eyebrow">
                BUILT HERE. HOSTED ANYWHERE.
              </span>
              <h2>
                Your agents,
                <br />
                beyond localhost.
              </h2>
              <p>
                Run the same app on your own VPS. Docker packages the runtime,
                Caddy handles HTTPS and streaming, and Git gives every release a
                traceable starting point.
              </p>
              <ButtonLink href="/docs/self-hosting" secondary>
                Deployment guide <ArrowRight size={15} />
              </ButtonLink>
            </div>
            <div className="deploy-command-panel">
              <p>Build and start your standalone application</p>
              <CodeBlock
                filename="terminal"
                code={
                  "docker compose -f infra/docker-compose.yml up -d --build"
                }
                language="bash"
              />
              <div className="deploy-panel-divider" />
              <p>Or deploy from Git after configuring your server</p>
              <CodeBlock
                filename="terminal"
                code={
                  "git push origin main\ncurl https://ai-sdk.pro/api/health"
                }
                language="bash"
              />
              <small>
                Configure your VPS and DNS. Visitors bring their own AI key.
                <br />
                Cloudflare can manage your DNS; the application runs on your
                server.
              </small>
            </div>
          </div>
        </section>
        <section className="reference-faq">
          <div className="reference-container">
            <span className="section-eyebrow">FAQ</span>
            <HomeFAQ />
          </div>
        </section>
        <section className="reference-final">
          <div className="reference-container">
            <h2>Make something yours.</h2>
            <div>
              <ButtonLink href="/chat">
                Start building <ArrowRight size={16} />
              </ButtonLink>
              <ButtonLink href="/docs/getting-started" secondary>
                Read documentation
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
