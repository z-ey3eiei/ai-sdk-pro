# Vercel Flags SDK + Private Blob in ai-sdk.pro Workspace

This integration is additive to the **single** ai-sdk.pro platform. Do not
start a second deployment dashboard or create another user database.

## Ownership and storage boundaries

- Better Auth (GitHub) authenticates users across Repositories, Deploy and Storage.
- The open-source `flags` SDK controls server-side rollout of Blob Storage.
  The flag name is `private-blob-storage-v1`; it defaults off until configured.
- Vercel Blob stores only owner-scoped Workspace attachments under
  `workspace/<better-auth-user-id>/<generated-uuid>.<extension>`.
- Cloudflare R2 remains authoritative for build artifacts, deployment logs and
  Worker release payloads. Never copy private user documents into public R2.
- No Vercel Blob read-write token or private file URL is sent to the client.

## Enablement (operator-controlled)

1. In the Vercel account that owns the `ai-sdk-pro` project, inspect its
   existing Blob stores. **Use an existing private store when available**.
   Do not connect this feature to a public Blob store.
2. Provision a private-store `BLOB_READ_WRITE_TOKEN` into the server-only
   runtime environment on the **VPS**. A Blob store's `BLOB_STORE_ID` or
   Vercel OIDC token alone is not a substitute outside Vercel.
3. Create a distinct `FLAGS_SECRET` for production (32 random bytes,
   base64url encoded), keep it server-only, and set
   `BLOB_STORAGE_ENABLED=true` only after the private store and deployment
   rate/size limits are approved.
4. Restart/redeploy the service using the normal gated release process; verify
   that anonymous GET/POST/DELETE to `/api/storage/blob` returns HTTP 401,
   then test a logged-in upload, list, private download and delete as one user.
   Check that another user's path returns HTTP 404.
5. The initial pilot accepts **JPEG/PNG/WebP/PDF up to 4 MB** and only
   two upload/delete requests per minute per process. This in-memory guard
   is not a cross-instance quota. Do not enable the feature for all users
   until durable quota/billing and abuse protection are in place.

## API

`GET /api/storage/blob`: list the signed-in owner's first 50 objects;
`GET /api/storage/blob?pathname=...`: authenticated download, always
`Content-Disposition: attachment`; `POST /api/storage/blob`: multipart
form field `file`; `DELETE /api/storage/blob`: JSON
`{"pathname":"workspace/..."}`. Mutations require a trusted same-origin
`Origin` header.

## Optional Vercel Flags dashboard provider

The source uses `flags/next` with a local `decide()` fallback.
It does **not** automatically connect to remote Vercel Flags Dashboard.
A later provider step may use `@flags-sdk/vercel` with an
environment-specific server-side `FLAGS` SDK key; do not assume
`FLAGS_SECRET` is an SDK key. The local server-side gate is independent
of the Cloudflare Deployment Worker feature gate.

## Source documentation

- https://flags-sdk.dev/docs/frameworks/next
- https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys
- https://vercel.com/docs/vercel-blob/private-storage
- https://vercel.com/docs/vercel-blob/using-blob-sdk
