# Changelog

## v0.1.0 — 2026-11-10

Initial ai-sdk.pro foundation release. The pnpm/Turborepo workspace contains a Next.js web app, independently buildable Fumadocs documentation, shared layered UI, and a typed client SDK.

The web app has a rebranded responsive landing page and a real streaming agent playground. `apps/web/components/llm.tsx` is the reusable LLM chat component, with configurable application endpoints, text/tool UI message rendering, stop/retry/new chat controls and no model credentials in browser code. `/chat` renders this component. The displayed version comes from the root package.json.

Server functionality uses AI SDK 6 ToolLoopAgent with a 20-step limit, real getCurrentTime/searchDocs/fetchUrl tools, optional owner-configured MCP, bounded input/timeout controls, origin/CORS policy and single-process rate limiting. The client package has typed SSE parsing, original protocol chunk preservation, external AbortSignal and a React binding.

Deployment source includes a non-root standalone Docker image, Caddy/Compose setup, operator runbooks, configurable VPS GitHub Actions and npm Trusted Publishing examples. Secrets, local runtime .env files, node_modules and generated build caches are not included in the source release.

This release does not claim a live VPS deployment, DNS changes, npm publication or a completed multi-tenant deployment/control plane. Provider credentials, domain routing and external automation must be configured by the owner before production use.
