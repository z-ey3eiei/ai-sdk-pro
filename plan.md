# ai-sdk.pro

The user changed the original sales-dashboard product to an independent AI agent platform, then selected `z-ey3eiei/orevrkplus.site` as the actual design source and requested a clean ai-sdk.pro rebrand. The user owns ai-sdk.pro in Cloudflare. The delivered foundation is a portable pnpm/Turborepo monorepo using Next.js App Router, TypeScript strict mode, AI SDK 6, Tailwind CSS v4, Fumadocs, and a publishable typed chat SDK. All model credentials and agent logic remain server-side.

## Implementation and boundaries

`apps/web` serves the landing page, interactive streaming playground, integrated documentation, safe tools, metadata and HTTP route handlers on Preview port 3000. `apps/docs` is an independently buildable Fumadocs app using the shared Thai documentation index. `packages/ui` shares design tokens, navigation, brand and code-copy components. `packages/sdk` exports a typed framework-agnostic ChatClient and a React hook. `infra` provides non-root Node 22 standalone Docker, Compose, Caddy, systemd fallback and operator guides. `.github/workflows` provides configurable GHCR/SSH VPS deployment and npm Trusted Publishing examples. Root workspace, turbo and strict TypeScript configuration make these independently checkable.

The agent has a 20-step limit, real getCurrentTime/searchDocs/fetchUrl tools, safe public-documentation URL execution policy and optional owner-configured MCP HTTP integration with cleanup. The route accepts UI messages, validates input, checks origins, rate limits requests, propagates cancellation and timeout, and returns genuine UI message SSE. In-memory rate limits are a single-process baseline, not a distributed or authenticated multi-tenant protection boundary. No shell, private repository access or deployment mutation is available through this chat.

The user first approved Sonnet 4.6; the provider catalog subsequently marked Claude temporarily unavailable. The user explicitly approved GPT-5 mini for live development tests. Model and provider remain environment-configurable; direct Anthropic supports switching back to Claude on the user's VPS. A plain streaming check and a real tool-enabled agent/SSE check passed. Provider failures are shown honestly without credentials.

Actual VPS deployment, Cloudflare DNS changes, npm publication, GitHub App installation and the proposed control/build/runtime platform are not performed without the needed access/configuration. The reference repository is read-only and is not the deployment remote. Preserve the Apache-2.0 license/notice for the adapted reference composition.

## Design

The confirmed live site orevrkplus.site now takes precedence over the GitHub main branch and earlier Turborepo screenshot. Use a black canvas, fine 64–80 px masked technical grid, centered single-line 76 px Geist desktop hero, muted grey headline ending, restrained red accents, a compact copyable pill command, wide layered terminal with a soft red ground light, technical tool strip, alternating two-column technical demos and connected feature grid. Preserve the reference's generous 96 px section spacing, two-column setup instructions, deployment panel, functional FAQ accordion, footer columns and responsive mobile stacking. Rebrand navigation, metadata, OG, favicon and all product copy as ai-sdk.pro. No previous brand names or invented deployment success should appear in the public product. The distinctive loop/arrow mark is owned by the new interface; the signature color is #FF0000. Motion remains subtle and respects reduced-motion preferences.

Public documentation has SSR/SSG content, per-route metadata/canonical addresses, code filename labels and copy buttons, search, social previews and llms.txt. Chat uses message.parts, genuine stream/tool states, stop, retry and new conversation controls. Its history remains in browser memory only.

The user specifically emphasized deliberate borders and layers and recommended Figma. The implementation records a reusable surface/edge/radius/elevation specification in design-system.md; a native Figma file must not be claimed without authorized Figma access.
