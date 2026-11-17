# ai-sdk.pro — native registration and explicit GitHub connection

## One identity, one database

Reuse the existing Neon Better Auth schema aisdk_pro, without creating another
user database. All login methods share the same aisdk_pro.user.id:
- aisdk_pro.user holds the platform identity and email verification state
- aisdk_pro.account holds credential and github provider rows tied to user_id
- aisdk_pro.session holds the platform session
- aisdk_pro.verification holds verification and password reset challenges
- imported_repository.user_id remains the same owner as before

The Cloudflare deployment control plane is not the user authentication database.
It maps a verified GitHub numeric identity to existing D1 project records only
after the owner explicitly links GitHub.

## Native registration

1. A new member signs up via /signup with name, email and 12+ character password.
2. Better Auth hashes the password in an account row; plaintext is never stored.
3. Member verifies email from mail.ai-sdk.pro via Resend, then logs in at /login.
4. Workspace, Chat and optional Storage are available without GitHub.
5. Account Settings at /workspace/account offers explicit GitHub OAuth linking.
6. After OAuth linking, the user installs GitHub App and selects repositories,
   then uses Import, Preview and Deploy under the same platform user ID.

## Existing GitHub members

Existing GitHub login and session cookies remain functional. Members who joined
with GitHub can sign in first, then enable a native password under the same
Better Auth account in /workspace/account (verified email required). If an email
belongs to an existing GitHub account, new sign-up must not silently create
a duplicate or merge a different identity. Sign in using the original method.

The Better Auth accountLinking policy disables implicit linking on same-email
OAuth sign-in. Different emails can link only from an authenticated, explicit
link-social OAuth flow and after the provider verifies the identity.

## Resend deployment settings

The Resend sending domain mail.ai-sdk.pro is verified and ready.
On VPS, configure these values server-side, never in NEXT_PUBLIC variables:

    PLATFORM_EMAIL_AUTH_ENABLED=true
    RESEND_API_KEY=(secure runtime secret, scoped to transactional email)
    RESEND_FROM_EMAIL=no-reply@mail.ai-sdk.pro

Email registration is gated off until the transport is configured. Production
cannot send verification or reset links without its own Resend API key. Never
commit credentials or send login/session tokens to the browser.

## Acceptance / security

- Unverified email must not sign in; verify-email callback is same-origin.
- Email-only member can access workspace, chat and storage without GitHub.
- Import/deploy API explicitly asks for GitHub linking when provider absent.
- GitHub OAuth linking retains the current Neon user ID.
- Existing GitHub users can enable credential login without data migration.
- Password reset is single-use, short-lived, and revokes other sessions.
- POST auth requests check Origin, path and a bounded JSON body; callback URLs
  are fixed to known same-origin destinations, not arbitrary redirects.
- Signed-in users only may initiate link-social; there is no implicit merge.
- Blob uploads and public deployment/AI inference gates remain independent.
- Verify Resend delivery, email-abuse protections and staging end-to-end before
  enabling unrestricted public sign-up.
