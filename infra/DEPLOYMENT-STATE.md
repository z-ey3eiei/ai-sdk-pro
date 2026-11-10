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
