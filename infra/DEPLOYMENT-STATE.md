# Deployment handoff — 2026-11-10

Owner requested an immediate checkpoint and GitHub push because task credits were low. This file is a factual resume point, not a successful-production-deployment claim.

## Provisioned and verified

Exactly ONE new DigitalOcean Droplet was authorized and created; the three older Droplets were not modified. Name: `ai-sdk-pro-prod`; Droplet ID: `617656205`; public IPv4: `167.172.73.127`; region: Singapore `sgp1`; image: Ubuntu 24.04; plan: Basic `s-2vcpu-4gb` (2 vCPU, 4 GiB RAM, 80 GiB SSD), $24/month at provisioning. No paid backups or other paid add-ons were enabled. The server is already a billed resource even while app deployment is unfinished.

SSH with the task-specific key was verified. Cloud-init completed successfully. Docker and Docker Compose are installed; Node 22 and Caddy 2.10 base images were pulled. UFW is active, SSH 22 is rate-limited, password authentication is disabled. HTTP 80/HTTPS 443 have not yet been opened. No app container has been deployed or public website verified at the time of this handoff.

The owner can import the separately delivered private SSH key into Termius, create a host for `167.172.73.127`, port `22`, username `root` (or `deploy`), and select that key. Do not place the private key or DigitalOcean token in this repository or app container.

## Cloudflare inspected, not yet changed

Domain `ai-sdk.pro` is active in Cloudflare. At inspection, both apex and wildcard were DNS-only CNAME records pointing to `pixie.porkbun.com`, TTL 600. SSL mode was Full. The owner explicitly authorized DNS changes and confirmed the domain has never hosted another website. No DNS write has been performed yet.

Zone ID: `c37d07b0fc5c6a804ab0dc0c54746868`. Apex record ID: `8f708ccee9ecd69145ec4bb362077b7d`. Wildcard record ID: `43a00a437b35ef50cbf306e3b8f47c8d`. Preserve the wildcard and any unrelated/mail records; update only the apex to IPv4 `167.172.73.127` and add an explicit `www` record as needed. Verify TLS and actual routing before reporting production success. Enabling Cloudflare proxy and Full (strict) after the origin has a valid certificate is the intended final configuration.

## BYOK change in this checkpoint

The owner changed the chat requirement to visitors selecting an AI provider and entering their own API key. Source now contains Anthropic/OpenAI/Google provider settings and per-request BYOK transport, fixed official provider endpoints, validation, safe errors and no owner-key fallback by default. Keys must stay in page/request memory only and never be persisted or logged. Public BYOK requests must not use privileged owner MCP tools. `BYOK_ONLY=true` is the public mode; private legacy server-key development requires explicit `BYOK_ONLY=false`. A BYOK-ready health/readiness response does not prove any visitor key has successfully called a provider. No valid visitor-provider live test has been performed.

## Resume deployment

1. Run source typecheck/tests and build the accepted checkpoint on the new VPS. Use a `git archive` of the intended commit and transfer it over SSH; GitHub credentials need not be installed on the server.
2. Use the repository Dockerfile for a non-root standalone image. Configure only `BYOK_ONLY=true` and allowed production origins in the app environment. Do not copy sandbox model keys, DigitalOcean token, SSH key or other admin secrets into build context or containers.
3. Start app privately and check `/api/health`, `/api/ready`, landing/chat/docs routes, and BYOK rejection/error policies. Publish no host port 3000; only Caddy should expose 80/443. Preserve the byte cap, deadlines, origin validation and bounded rate limiter.
4. Configure Caddy for HTTPS and non-buffered SSE. When using Cloudflare proxy, trust only official Cloudflare IP ranges, overwrite upstream `X-Real-IP` using the validated client IP, and do not log request credentials or bodies.
5. Update apex/www DNS, obtain and verify origin certificate, enable Cloudflare proxy/strict TLS, and test the live domain. Model smoke testing requires a real visitor-owned provider key; do not claim live success based on mock tests or 200 liveness alone.

Prepared task-local deployment scripts, receipt and DNS-before snapshot remain in `/home/ubuntu/ai-platform-deploy/` in the current task computer. Those are operational helpers, not secrets to commit. The private key is delivered separately and should be stored securely by the owner for recovery.
