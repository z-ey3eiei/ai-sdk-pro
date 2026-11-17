"use client";

export { GeistCard, StatusBadge, SubNavTabs, SkeletonBlock, EmptyStateBox } from "./primitives";
export type { PlatformStatusKind, SubNavItem } from "./primitives";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

export function BrandMark({ size = 25 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 21a12 12 0 1 1 10.5 7"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      <path d="m15 16 11-6-6 11Z" fill="currentColor" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ai-sdk.pro home">
      <BrandMark />
      <span>
        ai-sdk<span className="brand-domain">.pro</span>
      </span>
    </Link>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
  external = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`button ${secondary ? "secondary" : "primary"}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </Link>
  );
}
export function CodeBlock({
  code,
  filename,
  language = "typescript",
}: {
  code: string;
  filename?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="code-block">
      <div className="code-top">
        <span>{filename || language}</span>
        <button onClick={copy} aria-label={`Copy ${filename || "code"}`}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
export function InstallCommand({
  command = "npm install @aisdkpro/client",
}: {
  command?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
    }
  }
  return (
    <div className="install-wrap">
      <div className="install-command">
        <span className="terminal-dollar">$</span>
        <code>{command}</code>
        <button onClick={copy} aria-label="Copy install command">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        {copied && (
          <span className="copy-tip" role="status">
            Copied!
          </span>
        )}
      </div>
      {error && (
        <small className="clipboard-error">
          Select the command to copy it manually.
        </small>
      )}
    </div>
  );
}
const searchItems = [
  {
    title: "Templates",
    desc: "Runnable starters, source downloads and DevStack handoff",
    href: "/templates",
    category: "Learn",
  },
  {
    title: "Templates & DevStack",
    desc: "คู่มือใช้ starter และเปิดไป DevStack สำหรับโฮสต์",
    href: "/docs/using-templates",
    category: "Documentation",
  },
  {
    title: "Getting started",
    desc: "Install, configure, and run your first agent",
    href: "/docs/getting-started",
    category: "Documentation",
  },
  {
    title: "Defining agents",
    desc: "ToolLoopAgent, tools, and MCP integration",
    href: "/docs/defining-agents",
    category: "Documentation",
  },
  {
    title: "Client SDK",
    desc: "Typed clients and a React hook",
    href: "/docs/client-sdk",
    category: "Documentation",
  },
  {
    title: "Self-hosting",
    desc: "Deploy on your own VPS with Docker",
    href: "/docs/self-hosting",
    category: "Documentation",
  },
  {
    title: "Git deploys",
    desc: "Continuous deployment and rollback",
    href: "/docs/git-deploys",
    category: "Documentation",
  },
  {
    title: "Agent playground",
    desc: "Chat with a real streaming tool-enabled agent",
    href: "/chat",
    category: "Playground",
  },
  {
    title: "Repository workspace",
    desc: "Sign in with GitHub and import read-only snapshots",
    href: "/workspace",
    category: "Platform",
  },
];
export function Header({
  active,
  deployHref,
  accountHref = "/login",
  accountLabel = "Log in",
}: {
  active?: string;
  deployHref?: string;
  accountHref?: string;
  accountLabel?: string;
}) {
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("aisdkpro-theme") !== "light";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch(s => !s);
      }
      if (e.key === "Escape") {
        setSearch(false);
        setMenu(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("aisdkpro-theme", next ? "dark" : "light");
  }
  const matches = searchItems.filter(i =>
    `${i.title} ${i.desc}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <>
      <header className="site-header">
        <div className="header-start">
          <Brand />
          <span className="brand-chevron">
            <ChevronDown size={13} />
          </span>
          <nav
            className={menu ? "header-nav open" : "header-nav"}
            aria-label="Main navigation"
          >
            <Link
              href="/docs/getting-started"
              className={active === "docs" ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              Docs
            </Link>
            <Link
              href="/templates"
              className={active === "templates" ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              Learn
            </Link>
            <Link
              href="/chat"
              className={active === "chat" ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              Playground
            </Link>
            <Link href="/docs/client-sdk" onClick={() => setMenu(false)}>
              SDK
            </Link>
            {deployHref && (
              <Link
                href={deployHref}
                className={active === "deploy" ? "active" : ""}
                aria-current={active === "deploy" ? "page" : undefined}
                onClick={() => setMenu(false)}
              >
                Deploy
              </Link>
            )}
            <Link href="/workspace" onClick={() => setMenu(false)}>
              Workspace
            </Link>
            <Link href="/#features" onClick={() => setMenu(false)}>
              Features
            </Link>
            <Link href="/docs/self-hosting" onClick={() => setMenu(false)}>
              Self-hosting <ArrowUpRight size={11} />
            </Link>
          </nav>
        </div>
        <div className="header-end">
          <button className="search-trigger" onClick={() => setSearch(true)}>
            <Search size={14} />
            <span>Search…</span>
            <kbd>⌘ K</kbd>
          </button>
          <Link href={accountHref} className="ask-button header-login">
            {accountLabel}
          </Link>
          <Link href="/chat" className="ask-button">
            <Sparkles size={12} /> Ask AI
          </Link>
          <button
            className="icon-button theme-toggle"
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle navigation"
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      {search && (
        <div className="search-overlay" onClick={() => setSearch(false)}>
          <section
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search documentation"
            onClick={e => e.stopPropagation()}
          >
            <div className="search-input">
              <Search size={19} />
              <input
                autoFocus
                placeholder="Search documentation…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button
                onClick={() => setSearch(false)}
                aria-label="Close search"
              >
                <kbd>Esc</kbd>
              </button>
            </div>
            <div className="search-results">
              <span className="search-label">
                {query ? `${matches.length} results` : "QUICK LINKS"}
              </span>
              {matches.map(i => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setSearch(false)}
                >
                  <div>
                    <strong>{i.title}</strong>
                    <p>{i.desc}</p>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              {!matches.length && (
                <p className="no-results">
                  No results. Try “agents”, “SDK”, or “deploy”.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Brand />
          <p>Your infrastructure. Your agents. Your rules.</p>
        </div>
        <div>
          <h3>Platform</h3>
          <Link href="/chat">Playground</Link>
          <Link href="/#features">Features</Link>
          <Link href="/docs/client-sdk">Client SDK</Link>
        </div>
        <div>
          <h3>Resources</h3>
          <Link href="/docs/getting-started">Documentation</Link>
          <Link href="/docs/self-hosting">Self-hosting</Link>
          <Link href="/docs/git-deploys">Git deploys</Link>
        </div>
        <div>
          <h3>Built with</h3>
          <a href="https://ai-sdk.dev" target="_blank" rel="noreferrer">
            Vercel AI SDK <ArrowUpRight size={11} />
          </a>
          <a href="https://nextjs.org" target="_blank" rel="noreferrer">
            Next.js <ArrowUpRight size={11} />
          </a>
          <a href="https://fumadocs.dev" target="_blank" rel="noreferrer">
            Fumadocs <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ai-sdk.pro</span>
        <span>An independent project. Not affiliated with Vercel.</span>
        <span className="footer-status">
          <i /> Built for your infrastructure
        </span>
      </div>
    </footer>
  );
}
