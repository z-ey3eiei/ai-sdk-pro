
import { flag } from "flags/next";

// Provider-independent Flags SDK: works on the ai-sdk.pro VPS.
export const privateBlobUploads = flag({
  key: "private-blob-uploads",
  decide() {
    return process.env.BLOB_UPLOADS_ENABLED === "true";
  },
});

export const experimentalDeployFeatures = flag({
  key: "experimental-deploy-features",
  decide() {
    return process.env.DEPLOY_EXPERIMENTS_ENABLED === "true";
  },
});
