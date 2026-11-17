import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const webRoot = fileURLToPath(new URL("./apps/web", import.meta.url));

export default defineConfig({
  test: {
    // Cloudflare platform uses node:test and node:sqlite, not Vitest.
    // Its fixtures run in a separate isolated job.
    exclude: [...configDefaults.exclude, "infra/cloudflare-platform/test/**"],
  },
  resolve: {
    alias: {
      "@": webRoot,
    },
  },
});
