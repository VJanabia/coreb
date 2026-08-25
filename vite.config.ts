import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

const pagesDir = resolve(import.meta.dirname, "src/pages");

function collectHtmlInputs(dir: string): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const entry of readdirSync(dir, { recursive: true })) {
    const file = String(entry).replace(/\\/g, "/");
    if (file.endsWith(".html")) inputs[file] = resolve(dir, file);
  }
  return inputs;
}

export default defineConfig({
  root: pagesDir,
  publicDir: resolve(import.meta.dirname, "public"),
  base: "/",
  appType: "mpa",
  resolve: {
    alias: {
      // lets generated pages import the shared game bundle from outside `root` in dev
      "/game": resolve(import.meta.dirname, "src/game"),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: false,
    rollupOptions: {
      input: collectHtmlInputs(pagesDir),
    },
  },
  server: {
    port: 5173,
  },
});
