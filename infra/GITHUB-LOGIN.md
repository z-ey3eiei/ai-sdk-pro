# Public GitHub login and repository workspace

This service is for all visitors, not only the operator. The homepage has a Log in action, `/login` starts GitHub OAuth, and `/workspace` is each signed-in user's Dashboard. GitHub App installation authorization is per user/account and selected repositories: one user's authorization does not expose their repositories to other users. Neon queries are scoped to the validated session user. Public BYOK chat remains usable separately without login.

App: https://github.com/apps/ai-sdk-pro. Configure the GitHub App to permit installation on **any account** when offering it to external users; a private/only-owner installation setting will not support their repository imports. Repository Contents Read-only and Metadata Read-only, plus account Email addresses Read-only, are sufficient for the current login/import functionality. Read-only limits modification of source; it does not limit the number of users. Broader write/admin permissions are unnecessary for this release even if the operator enabled them. The GitHub consent screen is authoritative.

The OAuth callback is `https://ai-sdk.pro/api/auth/callback/github`. It is not `/api/github/webhook`. This release imports on an authenticated user's explicit action and has no webhook receiver; leave webhook Active disabled. No fake webhook acknowledgment or deployment event handler is supplied.

Runtime credentials are the GitHub App Client ID/Client Secret, an app-specific random Better Auth secret, and a Neon role scoped to `aisdk_pro`. Never use the task's GitHub connector token or infrastructure/AI keys as website OAuth credentials. The existing `neon_auth` schema is not modified. A migration owner must apply `apps/web/migrations/0001_platform.sql` explicitly; the app role is not an administrative migration role. `platform:migrate` runs the committed additive SQL in a transaction and needs an owner connection for migrations, not the runtime app DSN.

## Delivered data flow

A visitor signs in via GitHub and obtains a secure server session. Their dashboard lists repositories accessible through their installation of ai-sdk-pro. Import rechecks installation access, pins the default-branch commit, and saves actual repository metadata/text snapshots in Neon. It reads at most 100 eligible files, 64 KiB per file and 2 MiB total, skipping sensitive paths, binaries and dependency/vendor trees. The viewer shows pinned metadata and escaped text only. Every metadata/file route validates session and ownership; client user IDs are never accepted.

## Not a repository deployment service yet

Repository import does not execute package scripts, build containers, publish websites or run customer services. A separate isolated build/runtime worker, quota and abuse controls, deployment logs/events and per-project routing are required before an external user's Deploy action can honestly run code. Do not expose the production app's Docker socket or Neon/GitHub secrets to imported code. The VPS deployment of this platform itself is separate from deploying the visitors' repositories.
