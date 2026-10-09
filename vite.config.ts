import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        sidepanel: resolve(process.cwd(), "sidepanel.html"),
        options: resolve(process.cwd(), "options.html"),
        background: resolve(process.cwd(), "src/background.ts"),
      },
      output: { entryFileNames: "[name].js", chunkFileNames: "assets/[name]-[hash].js", assetFileNames: "assets/[name]-[hash][extname]" },
    },
  },
});
