import "server-only";
import { flag } from "flags/next";

/** Defaults off: a private Vercel Blob store and VPS token are required. */
export const privateBlobStorageEnabled = flag<boolean>({
  key: "private-blob-storage-v1",
  decide() {
    return process.env.BLOB_STORAGE_ENABLED === "true" &&
      Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  },
});

/** Keep the existing Workspace Deploy enabled unless explicitly disabled. */
export const cloudflareDeployWorkspaceEnabled = flag<boolean>({
  key: "cloudflare-deploy-workspace-v1",
  decide() {
    return process.env.DEPLOY_WORKSPACE_ENABLED !== "false";
  },
});
