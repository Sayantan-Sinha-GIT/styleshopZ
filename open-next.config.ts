import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Serve the build-time page shells without re-rendering them in the Worker.
// Products, account state and orders still load through uncached API requests.
const config = defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});

export default {
  ...config,
  buildCommand: "npm run build:next",
};
