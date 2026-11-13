"use client";

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
  Terminal,
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
    <Link href="/" className="brand" aria-label="ai-sdk.pro หน้าแรก">
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
    title: "Studio · frontend prototype",
    desc: "หน้าต้นแบบ projects, terminals และ deploy flow — ยังไม่เชื่อม runner",
    href: "/studio",
    category: "Prototype",
  },
  {
    title: "Project setup guide",
    desc: "ดู source, build boundary และสิ่งที่ต้องเตรียมก่อน deploy",
    href: "/studio/projects/new",
    category: "Prototype",
  },
  {
    title: "Starter templates",
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
    desc: "ทดสอบ streaming agent ด้วย provider key ของคุณเอง",
    href: "/chat",
    category: "Playground",
  },
  {
    title: "GitHub repository workspace",
    desc: "Sign in with GitHub and import read-only snapshots",
    href: "/workspace",
    category: "Platform",
  },
];
export function Header({
  active,
  accountHref = "/login",
  accountLabel = "เข้าสู่ระบบ",
}: {
  active?: string;
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
            id="primary-navigation"
            aria-label="เมนูหลัก"
          >
            <Link
              href="/studio"
              className={active === "studio" ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              Studio
            </Link>
            <Link
              href="/templates"
              className={active === "templates" ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              Starters
            </Link>
            <Link
              href="/docs/getting-started"
              className={active === "docs" ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              Docs
            </Link>
            <Link
              href="/chat"
              className={active === "chat" ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              Playground
            </Link>
            <Link href="/workspace" onClick={() => setMenu(false)}>
              Workspace
            </Link>
          </nav>
        </div>
        <div className="header-end">
          <button
            className="search-trigger"
            onClick={() => setSearch(true)}
            aria-label="ค้นหาเอกสารและหน้าในแอป"
            aria-haspopup="dialog"
            aria-expanded={search}
          >
            <Search size={14} />
            <span>ค้นหา…</span>
            <kbd>⌘ K</kbd>
          </button>
          <Link href={accountHref} className="ask-button header-login">
            {accountLabel}
          </Link>
          <Link href="/studio" className="ask-button header-studio-link">
            <Terminal size={13} /> Studio preview
          </Link>
          <button
            className="icon-button theme-toggle"
            onClick={toggleTheme}
            aria-label={dark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"}
            aria-controls="primary-navigation"
            aria-expanded={menu}
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
            aria-label="ค้นหาเอกสารและหน้าในแอป"
            onClick={e => e.stopPropagation()}
          >
            <div className="search-input">
              <Search size={19} />
              <input
                autoFocus
                aria-label="คำค้นหา"
                placeholder="ค้นหาเอกสาร, Studio, templates…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button
                onClick={() => setSearch(false)}
                aria-label="ปิดการค้นหา"
              >
                <kbd>Esc</kbd>
              </button>
            </div>
            <div className="search-results">
              <span className="search-label">
                {query ? `พบ ${matches.length} รายการ` : "ลิงก์ที่ใช้บ่อย"}
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
                  ไม่พบผลลัพธ์ ลองค้นหา “agents”, “SDK” หรือ “deploy”
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
          <p>Source, build boundary และ deployment choice — ออกแบบให้ตรวจสอบได้</p>
        </div>
        <div>
          <h3>พื้นที่ทำงาน</h3>
          <Link href="/studio">Studio prototype</Link>
          <Link href="/workspace">Repository workspace</Link>
          <Link href="/chat">AI playground</Link>
        </div>
        <div>
          <h3>เอกสาร</h3>
          <Link href="/docs/getting-started">เริ่มต้นใช้งาน</Link>
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
        <span>Frontend preview · ยังไม่เชื่อม terminal หรือ deployment targets</span>
        <span className="footer-status">
          <i /> ไม่มี live infrastructure ใน prototype นี้
        </span>
      </div>
    </footer>
  );
}
