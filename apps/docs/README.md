# ai-sdk.pro documentation app

This is an independently buildable Next App Router + Fumadocs documentation app. Page metadata, the manual Fumadocs page tree, search records, and rendered markdown use `lib/content.ts` as the source of truth.

Generate the checked-in MDX snapshots with:

```bash
pnpm exec tsx apps/docs/.tmp-write-docs.mts
```

Run checks from the workspace root with `pnpm --filter @aisdkpro/docs typecheck` and `pnpm --filter @aisdkpro/docs build`.
