# Cloudflare platform assembly — verified 2026-11-16

Staging account `2d92bd5b25768fa9093d6adc0a8887fc` (same zone `ai-sdk.pro`).

## Mapped resources

| Resource | Name | ID |
| --- | --- | --- |
| D1 | `aisdkpro-platform-staging` | `69978225-4049-47f6-b761-b402b73cdda3` |
| KV | `aisdkpro-platform-staging-routes` | `758c9c8189e14c96978c9ea8d9b9bf94` |
| R2 | `aisdkpro-platform-staging-builds` | (bucket name binding) |
| Queue | `aisdkpro-platform-staging-deploy` | producer/consumer on API worker |
| Queue DLQ | `aisdkpro-platform-staging-dead` | configured on consumer |
| WfP dispatch NS | `aisdkpro-platform-staging` | `a15e8723-aeed-4301-bd64-e5f3ab268700` |

## Workers

| Worker | URL / trigger |
| --- | --- |
| `aisdkpro-platform-api-staging` | Custom domain `https://deploy-staging.ai-sdk.pro` |
| `aisdkpro-platform-dispatch-staging` | Zone route `urban-couscous-deploy-test.ai-sdk.pro/*` (pilot) |

API worker secrets present: `GITHUB_*`, `ENCRYPTION_KEY`, `CLOUDFLARE_DEPLOY_TOKEN`.

Public vars wired in `wrangler.jsonc`: `GITHUB_CLIENT_ID`, `GITHUB_APP_SLUG=ai-sdk-pro`, `BETA_GITHUB_IDS=312459747`.

## Still operator-only

1. **D1 migration bookkeeping** — schema tables already exist remotely; if `wrangler d1 migrations list` still shows `0001_platform.sql` pending, mark it applied in the dashboard or avoid re-running the SQL.
2. **Project hostnames** — only the pilot Worker route above hits the dispatch worker. New projects need a proxied DNS name and a more-specific `*.ai-sdk.pro/*` route (or per-project route) before going past HTML smoke tests. Review apex/VPS routes before any wildcard.
3. **Custom domains (Cloudflare for SaaS)** — set `SAAS_ZONE_ID`, `SAAS_CNAME_TARGET`, and `SAAS_API_TOKEN` secret when ready.
4. **GitHub App** — confirm Callback/Webhook URLs on the `ai-sdk-pro` GitHub App match README; install the app on test repos.

## Verify locally

```bash
cd infra/cloudflare-platform
export CLOUDFLARE_API_TOKEN=...
./scripts/verify-assembly.sh
```