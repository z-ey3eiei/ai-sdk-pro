# Product direction

The user-selected repository z-ey3eiei/orevrkplus.site defines the landing-page design: centered Geist hero, black grid canvas, red accents and thin-bordered sections. The brand is cleaned and renamed ai-sdk.pro; the user owns this domain in Cloudflare. The reference repository is read-only. Adapted layout attribution and Apache-2.0 license are included without exposing the old brand as the new product.

The current foundation provides a working AI SDK 6 chat route, tool-enabled agent, typed SSE client SDK, Thai Fumadocs content, and portable Docker/VPS deployment files. Development streaming and getCurrentTime execution passed using user-approved GPT-5 mini. Production Anthropic is configurable through server-only credentials; no unavailable model is silently substituted.

The proposed public multi-tenant product separates control plane, build plane and runtime plane. Repository import/private agent jobs require authentication and authorization. Real deployment APIs require a configured GitHub App, persistent job/release storage, durable worker queue, a deployment adapter/artifact registry, and isolated execution with quotas. No arbitrary user code, host shell, fake deployment events or simulated rollback is included in the current chat app.

Origin policy is not authentication. The foundation has a bounded request reader, whole-request deadline, constrained CORS, single-process global cap, bounded per-identity rate limits, and trusted proxy headers only behind a private listener that overwrites them. Auth and distributed abuse protection remain prerequisites before running a public multi-tenant service. DigitalOcean administration credentials belong in a separate operator secret store, not in the model provider or app container.

Actual VPS access, DNS mutations, npm publication, GitHub App installation and production deployment were not performed. Liveness checks are separate from runtime configuration readiness, and a live chat smoke test is required to verify actual provider credentials.
