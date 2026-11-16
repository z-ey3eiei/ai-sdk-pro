# Static preview pilot

The pilot consumes one preview request at a time for an explicitly configured project and sends the pinned commit to GitHub Actions. The trial applies to a trusted repository with the existing `infra/sandbox-build.sh` interface. Public tenant workloads and production deployments need their own execution and publishing controls.

## Staging relay

The `urban-couscous` branch `aisdk/preview-pilot` has an Actions intake job for real pushes, alongside the isolated static build job. Its GitHub Actions OIDC token names the staging webhook as audience. The staging receiver verifies the issuer signature, subject, repository identity, workflow, branch, event and commit before using the same Neon intake table as the GitHub App.

The relay uses the existing staging-only pilot binding. To use it, stage the application from `main` with `BETTER_AUTH_URL=https://staging.ai-sdk.pro` and the staging Neon connection. A successful Actions `intake` job confirms that the push was recorded. The build artifact alone does not establish that the queue consumer dispatched the build or that Pages published a URL.

The GitHub App webhook remains the route for other authorized projects. The relay is restricted to this pilot branch while the App's webhook settings are being verified. Keep Pages publishing and the wildcard project host disabled until a queue-driven end-to-end test passes.

## Verified staging result

On 2026-11-16, [Coolify rollout #9](https://github.com/z-ey3eiei/ai-sdk-pro/actions/runs/43869880568) deployed the immutable-subject OIDC verifier. [Pilot push #5](https://github.com/z-ey3eiei/urban-couscous/actions/runs/43869924654) built successfully and recorded commit `94df574e4386d3805a626ffdf349fa3eecddb95c` in staging Neon as target `preview` with dispatch status `pending`. The push build ran in parallel with intake. Queue dispatch, Pages publishing, and the production wildcard host have not passed end-to-end verification.

## Setup

1. Apply platform migrations 0007 and 0008 to the staging Neon database. Configure the staging web runtime with `NEON_DATABASE_URL` and `GITHUB_DEPLOY_WEBHOOK_SECRET`. Use the same webhook secret on a staging GitHub App subscribed to push and pull request events.
2. Import the pilot repository in the staging workspace. Register its imported repository ID, GitHub App installation ID, and production branch in `deployment_project`. Enable automatic intake for this project only.
3. Install `aisdk-preview.yml` as `.github/workflows/aisdk-preview.yml` on the pilot repository's trusted default branch. Install the existing sandbox build script under `infra/sandbox-build.sh` on that branch. Restrict the GitHub `aisdk-preview` environment to the trusted workflow branch.
4. Set GitHub environment variables `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT=ai-sdk-pro-preview-pilot`, and secret `CLOUDFLARE_PAGES_TOKEN` scoped to Pages publishing in the staging account. Keep the Pages project's production branch set to `production`. The pilot only publishes preview aliases.
5. On a staging worker, provide `NEON_DATABASE_URL`, `PREVIEW_PILOT_PROJECT_ID`, `PREVIEW_PILOT_REPOSITORY` (owner/name), `PREVIEW_PILOT_INSTALLATION_ID`, `PREVIEW_PILOT_WORKFLOW_REF` (the trusted default branch), and `PREVIEW_PILOT_GITHUB_TOKEN` (Actions write on the pilot only). Run `pnpm --filter @aisdkpro/web exec tsx scripts/dispatch-preview.ts` from the source checkout. Use a serialized scheduler for recurring runs.
6. Push a non-production branch. Verify the matching intake row, GitHub Actions run and the URL in the run summary. The publish job checks both the live homepage and the pinned SHA before reporting success.

A dispatch marked uncertain may already have reached GitHub. Look up the delivery UUID in workflow runs before resetting anything. Allow only trusted repositories in this pilot. Per-tenant quotas, newest-commit promotion, log ingestion, UI status, production publishing and rollback remain follow-up work.
