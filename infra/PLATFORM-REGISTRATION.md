# Social login and repository workspace

The public login page at `/login` uses Better Auth with GitHub, Google, Facebook, and Apple OAuth. Only providers with both server-side client credentials are enabled. Configure `BETTER_AUTH_URL=https://ai-sdk.pro`, `BETTER_AUTH_SECRET`, the existing Neon database connection, and the provider credentials listed in `.env.example`.

Register these callbacks with each OAuth provider:

- GitHub: `https://ai-sdk.pro/api/auth/callback/github`
- Google: `https://ai-sdk.pro/api/auth/callback/google`
- Facebook: `https://ai-sdk.pro/api/auth/callback/facebook`
- Apple: `https://ai-sdk.pro/api/auth/callback/apple`

Use the matching values for the `*_CLIENT_ID` and `*_CLIENT_SECRET` variables. Apple client secrets are signed JWTs with an expiry and must be rotated before they expire. Keep all credentials server-side.

Each social provider signs in to the platform. GitHub sign-in only identifies the account. To import repositories, the signed-in user separately connects GitHub and installs the ai-sdk.pro GitHub App with read-only repository permissions. GitHub App installation authorization is per user/account.

The OAuth callback is not `/api/github/webhook`. This release imports on a user's explicit action and has no webhook receiver. Public BYOK chat remains available without login. Repository import does not execute package scripts or deploy customer code.

The platform currently stores account data in its existing Neon database. This change replaces the login methods only; it does not migrate the database.
