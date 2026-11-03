import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  buckets: {
    "twyn-uploads": { access: "private" },
  },
});
