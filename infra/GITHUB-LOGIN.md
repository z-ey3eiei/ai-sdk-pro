# Google sign-in and GitHub repository connection

The public login page at `/login` uses Google sign-in through Better Auth. The Google OAuth consent screen should use the platform name and branding `ai-sdk.pro` in Google Cloud Console. Runtime configuration uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

The Google Authorized redirect URI is the custom URL configured for this platform:

```
https://www.ai-sdk.pro/auth/platform
```

Better Auth handles the OAuth response on this path and forwards it to its internal Google callback handler. Set `BETTER_AUTH_URL=https://www.ai-sdk.pro` so Better Auth creates redirects and sessions for the same canonical host. Do not substitute `/api/auth/callback/google` in the Google Console for this configuration.

GitHub sign-in remains available only as an explicit account connection for repository access. Its callback is `https://www.ai-sdk.pro/api/auth/callback/github`. The GitHub App installation is separate from OAuth login and grants access to repositories selected by each user.

Google identifies the ai-sdk.pro account. GitHub is connected separately when the user wants to import repositories or deploy projects. Keep OAuth secrets server-side. Public BYOK chat remains available without login.

The existing platform account and session database remains Neon. This change replaces the login method and does not migrate stored accounts.
