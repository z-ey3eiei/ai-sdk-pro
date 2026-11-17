# Public Free Deploy rollout

**Goal:** A new verified ai-sdk.pro member can connect GitHub, import up to
three active projects on the Free plan, get one stable HTTPS URL for each project,
and receive automatic updates to that same URL on GitHub pushes.

## What already exists

- Cloudflare D1 enforces **3 active projects** on Free, **10 deployments per
  rolling 24 hours** and **1 concurrent build** (see `0001_platform.sql`).
- The Project records include `auto_deploy=1` by default.
- GitHub App Webhook verifies `X-Hub-Signature-256`, matches exact repo
  installation/branch, and deduplicates deliveries before queuing.
- Workflow publishes an immutable User Worker and atomically updates the
  project's `active_deployment_id` plus KV mapping. It does **not** change
  the hostname on later deployments; failed builds retain prior live release.
- Next.js/Astro build code runs through the Cloudflare Sandbox rather than
  `apps/web`. Framework build access must be verified separately.

## What has not yet launched

- `PUBLIC_DEPLOY_ENABLED=false` by default. Signed server-to-server access
  from ai-sdk.pro uses Better Auth and a 32+-byte `PLATFORM_BRIDGE_SECRET`.
- `PLATFORM_BRIDGE_ENABLED=false` until both endpoints have matching secrets
  and an authenticated staging session passes an end-to-end API test.
- `PROJECT_ROUTING_READY=false` until a real project URL has DNS/SSL and
  a targeted Worker Route, without affecting existing ai-sdk.pro services.
- `FRAMEWORK_BUILDS=disabled` in source until Sandbox network/secret isolation
  is verified for the Testsdkpro repository.

The standalone deploy-staging dashboard stays beta-only. Turning on Public
Deploy must **not** remove that login boundary or create a second platform.

## Operator account

The verified GitHub ID of `z-ey3eiei` has role `owner` in the existing
**Cloudflare staging D1** user row. A staging-only `pro` test entitlement
allows up to 25 projects while the general Free limit remains 3. This is
not a paid subscription or GitHub organization ownership and does not grant
the Better Auth production account a separate role automatically.

## Release checks, before switching on any public flag

1. Run CI and full `wrangler deploy --dry-run` with all bindings.
2. Deploy a complete Worker version (source, Secrets, D1/KV/R2/Queue, DO,
   Workflows and Sandbox) to Staging. Never update only one binding via PATCH:
   an earlier attempt created a faulty latest version with missing resources.
   Active version 17 was restored and is the last known-good version.
3. Verify real public registration, email confirmation and explicit GitHub link
   on an **actually deployed** ai-sdk.pro VPS release.
4. Import Testsdkpro, run Next.js build with network isolated and no
   access to platform credentials, create HTTPS URL, and verify static output.
5. Push a second commit to the same GitHub branch; check signed webhook,
   queue, worker publication, unchanged URL, and updated commit marker.
6. Verify Free 3/10/1 limits, cross-tenant isolation, failures/rollback,
   abuse/rate policy and DNS collision handling with reserved subdomains.
7. Only then activate public controls separately with monitored rollback.

This source change is a fail-closed feature gate and dashboard disclosure,
**not** evidence that the public system is live.
