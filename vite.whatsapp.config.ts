import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(process.cwd(), "src/content/whatsapp.ts"),
      name: "CatchUpWhatsAppAdapter",
      formats: ["iife"],
      fileName: () => "content/whatsapp.js",
    },
  },
});
