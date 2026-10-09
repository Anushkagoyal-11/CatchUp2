import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(process.cwd(), "src/content/slack.ts"),
      name: "CatchUpSlackAdapter",
      formats: ["iife"],
      fileName: () => "content/slack.js",
    },
  },
});
