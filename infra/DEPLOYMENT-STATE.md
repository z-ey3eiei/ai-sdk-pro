# Live VPS deployment — 2026-11-10

The AI Agent Platform is deployed on the owner's new VPS. This supersedes the earlier handoff that said the app/DNS were unfinished. Application runtime source is checkpoint `3e7282872e607a9a6da4158ecd4e0f9aec86bf94`, image `ai-sdk-pro-web:3e72828`, image digest `sha256:26129dd3e9f9068735b07caf8c97bc7be6ccd723acbf316696a4e66ab0b6a3bd`. Later documentation/checkpoint commits need not match this runtime image tag unless a new application image is built.

## Server and access

Exactly ONE new DigitalOcean Droplet was authorized and created. Name: `ai-sdk-pro-prod`; ID: `617656205`; public IPv4: `167.172.73.127`; Singapore `sgp1`; Ubuntu 24.04; Basic `s-2vcpu-4gb` (2 vCPU, 4 GiB RAM, 80 GiB SSD), $24/month at provisioning. No paid backups or extra paid services were enabled. All three older Droplets were preserved without changes.

SSH and cloud-init were verified. Docker, Compose and Buildx are installed. UFW permits rate-limited SSH 22 and public TCP 80/443. SSH password authentication is disabled. The owner private key was delivered separately for Termius (`root` or `deploy`, port 22); do not commit it or put DigitalOcean/SSH/admin credentials in app containers.

## Running deployment

`/opt/ai-sdk-pro/releases/3e72828` contains the accepted source archive, `/opt/ai-sdk-pro/current` points there, and `/opt/ai-sdk-pro/docker-compose.yml` manages `ai-sdk-pro-app-1` and `ai-sdk-pro-caddy-1`. The app is healthy and runs as non-root `nextjs`, with read-only filesystem, bounded memory/pids, dropped capabilities and no published host app port. Caddy is the only public HTTP/HTTPS entrypoint; both services restart `unless-stopped`.

`/opt/ai-sdk-pro/config/app.env` contains BYOK-only mode and the allowed production origins, not owner/sandbox model keys. The runtime inspection found no DigitalOcean, SSH private key, owner AI key or privileged MCP token environment names in the app container. Caddy configuration and certificate data volumes are durable on the VPS disk. They are not backed up by a paid backup service.

The fresh production Docker build, type compilation, page generation and private smoke checks passed. All four workspace source typechecks and 18/18 regression tests passed before the source checkpoint. Public HTTPS checks returned HTTP 200 for `/`, `/chat`, `/docs/getting-started`, `/api/health`, `/api/ready` and `/manus-routes.json`. `https://www.ai-sdk.pro/` redirects to `https://ai-sdk.pro/` with 301. Origin TLS 1.3 and hostname/certificate trust were verified without disabling certificate verification; the certificate inspected expires February 8, 2027. Caddy manages automatic certificate renewal.

## Cloudflare

Cloudflare is authoritative for `ai-sdk.pro` (nameservers `amanda.ns.cloudflare.com`, `roman.ns.cloudflare.com`); no Porkbun API key was required. The owner explicitly authorized DNS changes and confirmed the domain was unused. Apex A `ai-sdk.pro` now points to `167.172.73.127` and explicit CNAME `www.ai-sdk.pro` points to `ai-sdk.pro`. Cloudflare proxy is enabled for those two records and SSL mode is Full (strict). Wildcard `*.ai-sdk.pro` remains DNS-only CNAME `pixie.porkbun.com`; unrelated records were preserved.

Zone ID: `c37d07b0fc5c6a804ab0dc0c54746868`. Apex record ID: `8f708ccee9ecd69145ec4bb362077b7d`. www record ID: `7da5783b5d4f773b080463dc21f1e34a`. Public authoritative/resolver checks verified apex/www routing to the VPS before enabling proxy. Cloudflare-edge verification returned HTTP 200 with a cf-ray header. HTTPS landing/chat/docs/readiness, www redirect, keyless/hostile-origin rejection and invalid-key SSE failure were verified through the edge. A raw TCP probe was misleading in this task network; server listener/Docker mapping and an external HTTP timeout verified no published app port 3000.

## BYOK behavior and limits

Visitors choose Anthropic, OpenAI or Google and supply their own key. Keys remain in page/request memory, never browser persistence, cookies, database, logs, URLs or message parts. Public requests are BYOK-only; no owner/sandbox-key fallback and no privileged owner MCP tools are available to visitors. Fixed official provider endpoints and catalog models are enforced. Origin/byte/rate/deadline/cancellation constraints and sanitized UI-message SSE errors remain active.

On the real VPS, readiness confirmed BYOK-required with owner provider configuration false; keyless requests returned 400, hostile origins 403, and user-supplied provider endpoints 400. A negative test against an official provider using an intentionally invalid synthetic key verified honest failure without key echoing. This is NOT a successful model-generation test. Live successful generation still needs a real visitor-owned provider key and provider account/model access. The provider bills the visitor's account, not the platform owner.

The rate limiter is bounded, in-memory and single-process. This deployment is a BYOK chat/documentation foundation, not an account-based multi-tenant database, private repository importer, isolated build worker or shell/deploy control plane. Do not describe roadmap capabilities as running services.

## Operator commands

```bash
cd /opt/ai-sdk-pro
export APP_IMAGE=ai-sdk-pro-web:3e72828
docker compose ps
docker compose logs --tail=100 app caddy
curl --fail https://ai-sdk.pro/api/health
curl --fail https://ai-sdk.pro/api/ready
```

Future app updates should build a new accepted source checkpoint, verify privately, and change `APP_IMAGE` deliberately. Do not automatically deploy untested Git commits or enable inactive workflow templates. Keep the source/runtime distinction and verify actual HTTP/TLS/model behavior rather than claiming success from an API write or liveness alone.

## Login/Neon rollout — application source 191abcb

The accepted source 191abcb was built on the existing new VPS and privately smoke-tested before replacing the app. Runtime image is now `ai-sdk-pro-web:191abcb`, healthy/non-root with no host port mapping. The older 3e72828 image is retained for rollback. Current release is `/opt/ai-sdk-pro/releases/191abcb`; `/opt/ai-sdk-pro/runtime/deployment.json` records the source/image and previous image.

Public HTTPS/Cloudflare checks pass for landing, login, workspace, platform status/session and readiness. Configuration reports ready, signed-out session is null, repository APIs reject unauthenticated callers and provider-token API is blocked. Both private and public OAuth start return an official GitHub authorization URL with Secure/HttpOnly/SameSite=None cookie flags. The browser reaches GitHub's real login page for ai-sdk.pro; full user authorization, session creation and actual repo import remain pending human login. No test user or fake import was created. All four workspace typechecks and 38 focused regression tests pass; production build passed on Sandbox and VPS.

The existing Neon project proud-mountain-62804552/default branch br-sparkling-frog-b73xn84o/neondb received only the additive aisdk_pro schema. Runtime role aisdk_pro_app has app-schema access but no USAGE of the existing neon_auth schema. GitHub/Neon/Better Auth credentials are stored in private Docker runtime configuration, not source/image/public API. No DigitalOcean/SSH/owner model/MCP secret names are present in the running app. OAuth tokens are encrypted in Neon. GitHub App owner controls its permissions; the importer uses GET/read operations only and does not execute/build/deploy repository code.

The owner has separately requested actual visitor-repository build/deploy after this phase. That worker/control-plane phase is not deployed yet and needs an isolation/resource decision before exposing untrusted-code execution to public users. No new billed worker infrastructure was created.

## Real-user login confirmation — 2026-11-10 13:57

The owner reported login succeeds on their own device. Read-only aggregate metadata confirms one GitHub account and one active session (latest created 2026-11-10 06:54:29Z), so real OAuth exchange/session persistence has succeeded. No user profile, email, access token or session token was read or reused. Imported repository count remains zero; import UAT is still unconfirmed. The owner reported two earlier errors; no repeated login was attempted to reproduce them. Error text is needed to classify the earlier failures, and no GitHub anti-abuse/ban guarantee is made.

## Session persistence rollout — 2026-11-10 14:25

Source `015477f` is live on VPS as `ai-sdk-pro-web:015477f` and healthy. Production image build/private smoke passed before switch; signing secret was preserved. HTTPS health/status/Login/Workspace return 200; public status reports sessionIdleSeconds=10800 and renewal from an untrusted origin returns 403. Session-cookie forwarding/token-stripping and activity/idle/UI store regressions pass (47 tests total, all workspace typechecks pass). No repeat GitHub authorization/login or user-token impersonation was performed. Existing active app sessions were capped to the same three-hour maximum through the app schema only; token/account values were not read or changed. Real user navigation UAT is still to be confirmed from their own device; repository import remains unconfirmed.

Next scope is ONLY Build Worker. Platform keys/CLI/npm and full deployment control plane are deferred by the owner; no new worker resource or destructive VPS replacement has been approved.

## Current release preparation — 2026-11-10 18:06

The owner prioritized ai-sdk.pro as the product front door plus real tools/runnable starters, handing hosting to existing DevStack rather than duplicating deployment. Existing homepage composition/global styles/auth/session code are unchanged; only the old FAQ copy and existing Learn navigation target/search entries were corrected. Three source starters, catalog/detail pages, Thai tutorial, public read-only catalog and hash-named ZIPs are built. Main workspace build/typechecks and 49 regression tests pass; both Next starter production builds/typechecks and static starter smoke pass. Three packaging safety tests verify credential guards, deterministic ZIPs and failed-validation preservation; all current ZIP CRC/digests/counts match. Contact is owner-confirmed sdkbank@1origin.dev. New app rollout is pending staged private/public checks; live runtime remains 015477f until verified switch. Separate Cloudflare worker/private-test approval is paused; no Worker/Container/Queue/R2 or VPS creation/deletion/DevStack mutation was performed. API keys/CLI/npm remain deferred.

## Source access blocker — 2026-11-10 18:10

The current GitHub connector identifies devstacksdk. The old canonical repo z-ey3eiei/ai-sdk-pro returns Repository not found; no source push/checkpoint was recorded for this Showcase release and no remote/target was silently changed. Tested source is local Git revision 0293758, with a verified source ZIP backup (289 tracked files, CRC valid, env/build/bytecode caches excluded). VPS deployment from that tested archive is independent of GitHub login. A deferred owner question offers a new private devstacksdk/ai-sdk-pro repository; do not create/switch it until owner confirmation and the managed transfer workflow succeeds. DevStack source repo is reference-only and must not receive ai-sdk.pro code.

## Verified live Showcase — 2026-11-10 18:16

VPS runtime is now ai-sdk-pro-web:0293758, healthy with ports={3000/tcp:null}. Previous image 015477f remains for rollback. Staged production build/private pages/catalog/ZIP digest/privacy/three-hour session checks passed before switch and signing secret was preserved. Public HTTPS returned 200 for root/Templates/all three detail pages/using-templates guide/chat/workspace/login/health/status/route manifest/sitemap; all three downloaded ZIPs match source SHA-256/byte/file counts and CRC. Unknown starter is 404; protected repository APIs remain 401, keyless BYOK remains rejected. No OAuth replay, user-token access, model generation, repository import or DevStack deploy was performed in these checks. Existing homepage styles/layout and auth/session source were unchanged. Contact sdkbank@1origin.dev is visible on new pages; no SMTP/DNS/Caddy/auth-secret/Neon/DevStack mutation or new worker resource was made. Source GitHub push is still blocked pending owner choice of new canonical private repo; local source backup is complete.
