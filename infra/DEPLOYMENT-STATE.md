# Live VPS deployment — current as of 2026-11-12

The current application runtime source is checkpoint `bc5aac7287952bb92f8514d906196b221934bf31`, image `ai-sdk-pro-web:bc5aac7`, image ID `sha256:70e8e582130dff8b8a08af96ea01a4a398f4ccc5d56f80b44c4859a3a1e908db`; `/opt/ai-sdk-pro/current` points to `/opt/ai-sdk-pro/releases/bc5aac7`. The original 3e72828 deployment and subsequent dated entries below are historical release records. Rollback images `ai-sdk-pro-web:f3ecac1` and `ai-sdk-pro-web:0293758` remain available.

## Server and access

Exactly ONE new DigitalOcean Droplet was authorized and created. Name: `ai-sdk-pro-prod`; ID: `617656205`; public IPv4: `167.172.73.127`; Singapore `sgp1`; Ubuntu 24.04; Basic `s-2vcpu-4gb` (2 vCPU, 4 GiB RAM, 80 GiB SSD), $24/month at provisioning. No paid backups or extra paid services were enabled. All three older Droplets were preserved without changes.

SSH and cloud-init were verified. Docker, Compose and Buildx are installed. UFW permits rate-limited SSH 22 and public TCP 80/443. SSH password authentication is disabled. The owner private key was delivered separately for Termius (`root` or `deploy`, port 22); do not commit it or put DigitalOcean/SSH/admin credentials in app containers.

## Running deployment

`/opt/ai-sdk-pro/releases/bc5aac7` contains the active accepted source archive, `/opt/ai-sdk-pro/current` points there, and `/opt/ai-sdk-pro/docker-compose.yml` manages `ai-sdk-pro-app-1` and `ai-sdk-pro-caddy-1`. The app is healthy and runs as non-root `nextjs`, with read-only filesystem, bounded memory/pids, dropped capabilities and no published host app port. Caddy is the only public HTTP/HTTPS entrypoint; both services restart `unless-stopped`.

`/opt/ai-sdk-pro/config/app.env` contains BYOK-only mode and the allowed production origins, not owner/sandbox model keys. The runtime inspection found no DigitalOcean, SSH private key, owner AI key or privileged MCP token environment names in the app container. Caddy configuration and certificate data volumes are durable on the VPS disk. They are not backed up by a paid backup service.

The fresh production Docker build, type compilation, page generation and private smoke checks passed. All four workspace source typechecks and 18/18 regression tests passed before the source checkpoint. Public HTTPS checks returned HTTP 200 for `/`, `/chat`, `/docs/getting-started`, `/api/health`, `/api/ready` and `/manus-routes.json`. `https://www.ai-sdk.pro/` redirects to `https://ai-sdk.pro/` with 301. Origin TLS 1.3 and hostname/certificate trust were verified without disabling certificate verification; the certificate inspected expires February 8, 2027. Caddy manages automatic certificate renewal.

## Cloudflare

Cloudflare is authoritative for `ai-sdk.pro` (nameservers `amanda.ns.cloudflare.com`, `roman.ns.cloudflare.com`); no Porkbun API key was required. The owner explicitly authorized DNS changes and confirmed the domain was unused. Apex A `ai-sdk.pro` now points to `167.172.73.127` and explicit CNAME `www.ai-sdk.pro` points to `ai-sdk.pro`. Cloudflare proxy is enabled for those two records and SSL mode is Full (strict). Wildcard `*.ai-sdk.pro` remains DNS-only CNAME `pixie.porkbun.com`; unrelated records were preserved.

Zone ID: `c37d07b0fc5c6a804ab0dc0c54746868`. Apex record ID: `8f708ccee9ecd69145ec4bb362077b7d`. www record ID: `7da5783b5d4f773b080463dc21f1e34a`. Public authoritative/resolver checks verified apex/www routing to the VPS before enabling proxy. Cloudflare-edge verification returned HTTP 200 with a cf-ray header. HTTPS landing/chat/docs/readiness, www redirect, keyless/hostile-origin rejection and invalid-key SSE failure were verified through the edge. A raw TCP probe was misleading in this task network; server listener/Docker mapping and an external HTTP timeout verified no published app port 3000.

## BYOK behavior and limits

Visitors choose Anthropic, OpenAI or Google and supply their own key. Keys remain in page/request memory, never browser persistence, cookies, database, logs, URLs or message parts. Public requests are BYOK-only; no owner/sandbox-key fallback and no privileged owner MCP tools are available to visitors. Fixed official provider endpoints and catalog models are enforced. Origin/byte/rate/deadline/cancellation constraints and sanitized UI-message SSE errors remain active.

On the real VPS, readiness confirmed BYOK-required with owner provider configuration false; keyless requests returned 400, hostile origins 403, and user-supplied provider endpoints 400. A negative test against an official provider using an intentionally invalid synthetic key verified honest failure without key echoing. This is NOT a successful model-generation test. Live successful generation still needs a real visitor-owned provider key and provider account/model access. The provider bills the visitor's account, not the platform owner.

The rate limiter is bounded, in-memory and single-process. The current release also includes GitHub login, Neon-backed per-user workspace, read-only repository import, the three-hour session policy, starter catalog/downloads, Thai docs, SEO metadata and self-hosted typography. Public chat remains BYOK-only. The approved keyless Workers AI/DO/R2 phase, isolated repository build worker, shell/deploy control plane and visitor-side deployment are not running services; do not describe those roadmap items as deployed.

## Operator commands

```bash
cd /opt/ai-sdk-pro
export APP_IMAGE=ai-sdk-pro-web:bc5aac7
docker compose ps
docker compose logs --tail=100 app caddy
curl --fail https://ai-sdk.pro/api/health
curl --fail https://ai-sdk.pro/api/ready
```

Future app updates should build a new accepted source checkpoint, verify privately, and change `APP_IMAGE` deliberately. Do not automatically deploy untested Git commits or enable inactive workflow templates. Keep the source/runtime distinction and verify actual HTTP/TLS/model behavior rather than claiming success from an API write or liveness alone.

## Historical Login/Neon rollout — application source 191abcb

The accepted source 191abcb was built on the existing new VPS and privately smoke-tested before replacing the app. Runtime image is now `ai-sdk-pro-web:191abcb`, healthy/non-root with no host port mapping. The older 3e72828 image is retained for rollback. Current release is `/opt/ai-sdk-pro/releases/191abcb`; `/opt/ai-sdk-pro/runtime/deployment.json` records the source/image and previous image.

Public HTTPS/Cloudflare checks pass for landing, login, workspace, platform status/session and readiness. Configuration reports ready, signed-out session is null, repository APIs reject unauthenticated callers and provider-token API is blocked. Both private and public OAuth start return an official GitHub authorization URL with Secure/HttpOnly/SameSite=None cookie flags. The browser reaches GitHub's real login page for ai-sdk.pro; full user authorization, session creation and actual repo import remain pending human login. No test user or fake import was created. All four workspace typechecks and 38 focused regression tests pass; production build passed on Sandbox and VPS.

The existing Neon project proud-mountain-62804552/default branch br-sparkling-frog-b73xn84o/neondb received only the additive aisdk_pro schema. Runtime role aisdk_pro_app has app-schema access but no USAGE of the existing neon_auth schema. GitHub/Neon/Better Auth credentials are stored in private Docker runtime configuration, not source/image/public API. No DigitalOcean/SSH/owner model/MCP secret names are present in the running app. OAuth tokens are encrypted in Neon. GitHub App owner controls its permissions; the importer uses GET/read operations only and does not execute/build/deploy repository code.

At that time, the owner had separately requested actual visitor-repository build/deploy after the auth phase. That worker/control-plane phase was not deployed and needed an isolation/resource decision before exposing untrusted-code execution to public users. No new billed worker infrastructure was created in that phase.

## Real-user login confirmation — 2026-11-10 13:57

The owner reported login succeeds on their own device. Read-only aggregate metadata confirms one GitHub account and one active session (latest created 2026-11-10 06:54:29Z), so real OAuth exchange/session persistence has succeeded. No user profile, email, access token or session token was read or reused. Imported repository count remains zero; import UAT is still unconfirmed. The owner reported two earlier errors; no repeated login was attempted to reproduce them. Error text is needed to classify the earlier failures, and no GitHub anti-abuse/ban guarantee is made.

## Historical session persistence rollout — 2026-11-10 14:25

Source `015477f` is live on VPS as `ai-sdk-pro-web:015477f` and healthy. Production image build/private smoke passed before switch; signing secret was preserved. HTTPS health/status/Login/Workspace return 200; public status reports sessionIdleSeconds=10800 and renewal from an untrusted origin returns 403. Session-cookie forwarding/token-stripping and activity/idle/UI store regressions pass (47 tests total, all workspace typechecks pass). No repeat GitHub authorization/login or user-token impersonation was performed. Existing active app sessions were capped to the same three-hour maximum through the app schema only; token/account values were not read or changed. Real user navigation UAT is still to be confirmed from their own device; repository import remains unconfirmed.

At that time, the next scope was ONLY Build Worker. Platform keys/CLI/npm and full deployment control plane were deferred; no new worker resource or destructive VPS replacement had been approved. The owner later separately authorized keyless chat on ai-sdk.pro only; current status/constraints are in `PROJECT-MEMORY.md`.

## Historical release preparation snapshot — 2026-11-10 18:06

At the time, the owner prioritized ai-sdk.pro as the product front door plus real tools/runnable starters, handing hosting to existing DevStack rather than duplicating deployment. The initial Showcase implementation and checks are described in this historical snapshot. The later SEO and typography release records below supersede the runtime version here. Separate Cloudflare worker/private-test approval was paused at that time; the owner later approved the keyless-chat phase recorded in `PROJECT-MEMORY.md`. No Worker/Container/Queue/R2 or VPS creation/deletion/DevStack mutation was performed in this historical release. API keys/CLI/npm remain deferred.

## Historical source access blocker — resolved later on 2026-11-10

At the time, the active GitHub connector did not identify the old canonical repo and the initial Showcase checkpoint was not recorded. This access blocker was later resolved using the authorized `z-ey3eiei/ai-sdk-pro` account; the canonical repo remained the original private repo, and later source checkpoints were pushed there. The tested source at this historical stage was local revision 0293758 with a verified source ZIP. DevStack source repo remains reference-only and must not receive ai-sdk.pro code.

## Historical live Showcase — 2026-11-10 18:16

At the time, VPS runtime was `ai-sdk-pro-web:0293758`, healthy with no host-published app port. Previous image 015477f remained for rollback. Staged production build/private pages/catalog/ZIP digest/privacy/three-hour session checks passed before switch and signing secret was preserved. Public HTTPS returned 200 for root/Templates/all three detail pages/using-templates guide/chat/workspace/login/health/status/route manifest/sitemap; all three downloaded ZIPs matched source SHA-256/byte/file counts and CRC. Unknown starter was 404; protected repository APIs returned 401; keyless BYOK was rejected. No OAuth replay, user-token access, model generation, repository import or DevStack deploy was performed in those checks. The source-access blocker and statement that GitHub push was blocked were later resolved; the canonical private repo remained `z-ey3eiei/ai-sdk-pro`.


## Historical SEO metadata release — 2026-11-11 09:25 ICT

Application source checkpoint `f3ecac14fcae77f331f6eb985a385acfc09c24aa` was built from a verified source archive (SHA-256 `ac39072e760ca2620695fab55e296246bd252ad621fc2be830897fa36cc0960e`) and deployed on the existing VPS as `ai-sdk-pro-web:f3ecac1` (image ID `sha256:08dfe01fd036ce344de178ee9450dc70d511e46a32d4069d9886a871d3f0954f`). `/opt/ai-sdk-pro/current` points to `/opt/ai-sdk-pro/releases/f3ecac1`; `ai-sdk-pro-app-1` is healthy. Previous image `ai-sdk-pro-web:0293758` remains available for rollback. The private smoke container was removed after checks. The image build completed; it emitted a non-blocking existing warning that `apps/web/lib/version.ts` imports a named export from a default-exporting package module.

Read-only production GETs using Googlebot/Twitterbot user agents confirmed: `/robots.txt` and `/sitemap.xml` return 200; sitemap contains exactly 12 canonical public content URLs; each sitemap page returns 200 with meaningful H1, route-specific 30–60-character title, 50–160-character description, matching canonical, Open Graph image, and `summary_large_image` Twitter card. `/chat`, `/login` and `/workspace` remain `noindex` and outside the sitemap. Unknown template, documentation and general paths return a real 404 with `noindex` and no canonical. `/opengraph-image` returns PNG 200; `/api/health`, `/api/ready` and `/manus-routes.json` return 200 (route manifest contains 15 entries). The readiness response still requires visitor BYOK; no model inference or database write was performed. No DNS/Cloudflare setting, DevStack service or new paid resource changed. No Google Search Console submission, indexing confirmation or ranking result is claimed.


## Typography release — 2026-11-12 19:47 ICT

Application source checkpoint `bc5aac7287952bb92f8514d906196b221934bf31` was exported with `git archive` (archive SHA-256 `bf6e1fdeba5ff2a9a8943c432cd0b12fca2cd6a81c6b29276ee0a66fa9dc22b5`); the VPS copy matched that checksum before build. Isolated Docker production build completed as `ai-sdk-pro-web:bc5aac7`, image ID `sha256:70e8e582130dff8b8a08af96ea01a4a398f4ccc5d56f80b44c4859a3a1e908db`. Private smoke verified page rendering and readiness before switching; `ai-sdk-pro-app-1` is healthy and `/opt/ai-sdk-pro/current` points to `/opt/ai-sdk-pro/releases/bc5aac7`. The prior `f3ecac1` and older `0293758` images remain available. No smoke container remains.

`pnpm test` passed 79/79 tests in 14 files; `pnpm typecheck` passed all four workspace packages; full `pnpm build` passed for web and docs. The production Docker build also passed; it logged a non-blocking existing warning from `apps/web/lib/version.ts` about a named `version` export. Caddy configuration validation passed; its formatter emitted a non-blocking style warning. The font follows the owner-provided [Next.js `next/font` documentation](https://nextjs.org/docs/app/api-reference/components/font).

Read-only public GETs through `https://ai-sdk.pro` confirmed IBM Plex Sans Thai and local Next styles on `/`, `/templates`, `/templates/streaming-chat`, `/chat`, `/docs/getting-started`, `/workspace` and `/login`. No `fonts.googleapis.com` or `fonts.gstatic.com` URLs were found in those HTML documents or their stylesheets. All 16 unique WOFF2 assets referenced by the homepage stylesheet returned HTTP 200 with a font MIME type; the stylesheet includes the Thai unicode range. `/api/health` returned 200, `/api/ready` remained `ready-for-byok` with `byokRequired=true`, the route manifest returned 200 with 15 entries, and an unknown template remained a real 404.

The Docker app port `3000` remains intentionally unbound on the host (`docker ps` shows container-only `3000/tcp`); the app health check passed from inside the container and via public HTTPS. A direct host-loopback request to `127.0.0.1:3000` is expected to fail and is not a reason to publish that port. Caddy remains the public HTTP/HTTPS entrypoint. No DNS/Cloudflare configuration, application secrets, provider settings, database rows, DevStack service, VPS resource or paid add-on changed. No inference/model call was made; chat remains BYOK-only.


## Feature-branch integration record — 2026-11-17 (NOT a production release)

Source: `z-ey3eiei/ai-sdk-pro`, branch
`feat/platform-phases-0-6-20261117`, review PR #12 (draft).
The verified production checkpoint above remains the last recorded VPS state.
This branch has **not** been merged to `main`, deployed to the VPS,
or deployed as a new Cloudflare Keyless Worker.

Implemented on the feature branch: shared black/red tokens and UI primitives,
repository detail tabs and copy code, standalone HMAC-signed chat-session token
endpoint, isolated Cloudflare `apps/agent-worker` source, shared per-user daily
quota/global monthly budget reservation coordinator, dual-mode BYOK/Edge chat
UI, isolated preview intake API with ownership/pinned-commit checks, and
read-only deployment timeline. Private R2 authorization policy is implemented
as a pure helper with synthetic tests; R2 upload/download are **not enabled**.

Existing BYOK endpoint and legacy deployment workflow are retained; the new
preview path does **not** execute imported repository code. Tests, Worker
runtime verification, actual Cloudflare account inventory and end-to-end
WebSocket/inference smoke must pass before opening service to users.

Do not equate this source implementation to a deployed working service.
New infrastructure cost or public deployment requires explicit approval.
