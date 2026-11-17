
# Flags SDK and optional Vercel Blob integration

This integration is part of the existing ai-sdk.pro Next.js Workspace on the VPS.
It does **not** create another login, deploy dashboard, database, or web platform.

## Flags SDK

- Package: flags 4.4.0, using flags/next (provider-independent).
- Configured flags: private-blob-uploads and experimental-deploy-features.
- The VPS evaluates the flags using server environment variables.
- BLOB_UPLOADS_ENABLED and DEPLOY_EXPERIMENTS_ENABLED both default to false.
- FLAGS_SECRET is for secure overrides and Flags Explorer; keep it server-side.
- The flag is not an authorization mechanism. API endpoints still validate
  Better Auth sessions, owner namespaces, request origins and quotas.

## Vercel Blob

- Package: @vercel/blob 2.9.0
- Create a PRIVATE store in the existing Vercel account, then install its
  BLOB_READ_WRITE_TOKEN only in the VPS server-only runtime environment.
- BLOB_UPLOADS_ENABLED=true must be explicitly configured **after** a store
  and token are verified. Until then, the UI reports storage not activated.
- User-uploaded files live under users/<BetterAuth user id>/uploads/<UUID>/.
  Listing and downloads are scoped to the authenticated user.
- Upload API: POST /api/storage/blobs with a binary request body, content-type
  and x-file-name header. Supported: PNG, JPEG, WebP and PDF, maximum 4 MiB.
  MIME type and file signatures are checked; the server returns only a safe
  pathname, never a provider URL or token.
- List API: GET /api/storage/blobs, first 50 private blobs for the signed-in user.
- Download API: GET /api/storage/blobs/download?pathname=... (authenticated,
  owner-checked and streamed as an attachment).
- Workspace UI: /workspace/storage, reusing the existing login and navigation.
- No public-store fallback. No client-side upload credentials.
- No automatic migration or changes to Cloudflare R2, D1, KV, build queue,
  Workers for Platforms, Preview/Production deploys or BYOK chat.

## Activation checklist (operator only)

1. Create or select a Vercel Blob **private** store for user files.
2. Bind its BLOB_READ_WRITE_TOKEN in the ai-sdk.pro VPS secret environment.
3. Set BLOB_UPLOADS_ENABLED=true; keep DEPLOY_EXPERIMENTS_ENABLED=false until
   the unrelated deployment pipeline has passed its own E2E readiness gates.
4. Smoke-test unauthorized GET/POST (401), cross-user download (404),
   disallowed MIME/oversized body (415/413), authorized upload/download,
   and that public direct access to the stored URL is rejected.
5. Inspect Vercel Blob storage/transfer costs and define retention/quota
   policies before making uploads available to all users.

Never commit real tokens, configure them as NEXT_PUBLIC_ variables, or upload
sensitive customer content to a public store.

References:
- https://flags-sdk.dev/docs/frameworks/next
- https://vercel.com/docs/vercel-blob/using-blob-sdk
- https://vercel.com/docs/vercel-blob/private-storage

CI policy: keep this feature branch unmerged until frozen-lockfile install, strict
TypeScript checks, regression tests and the Next.js build succeed. Activation
on production is separate from code review and requires a private Blob token.
