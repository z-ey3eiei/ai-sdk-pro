# Auth/import implementation references

Official APIs inspected on 2026-11-10:

- Better Auth GitHub provider: https://www.better-auth.com/docs/authentication/github
- Better Auth Next.js: https://www.better-auth.com/docs/integrations/next
- Better Auth OAuth server APIs: https://www.better-auth.com/docs/concepts/oauth
- Better Auth account token encryption, baseURL and cookies: https://www.better-auth.com/docs/reference/options
- Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
- GitHub OAuth scopes and recommendation to use a fine-grained GitHub App: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- GitHub App user installations/repository listing: https://docs.github.com/en/rest/apps/installations

Dependencies pinned from current npm catalog: better-auth 1.7.19, @better-auth/drizzle-adapter 1.7.19, drizzle-orm 0.45.4, @neondatabase/serverless 1.2.0, drizzle-kit 0.31.11. Verify installed signatures rather than older examples. Neon managed Auth demo social credentials are not appropriate for production; this platform uses its own Better Auth/GitHub App configuration and Neon Postgres tables.

Session access tokens are obtained server-side using auth.api.getAccessToken and must never be returned by application browser APIs. Only read-only GitHub App Contents/Metadata and Email address permissions are needed. Ordinary OAuth repo/public_repo scopes include write access and are not this app's default.
