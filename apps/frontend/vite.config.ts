import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const uiSrc = path.resolve(root, "../../packages/ui/src");

function uiPackageAlias(): Plugin {
  return {
    name: "ui-package-alias",
    resolveId(id, importer) {
      if (!id.startsWith("@/") || !importer) return null;
      const normalized = importer.replaceAll("\\", "/");
      if (!normalized.includes("/packages/ui/")) return null;
      return path.resolve(uiSrc, id.slice(2));
    },
  };
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    uiPackageAlias(),
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
    varlockVitePlugin(),
  ],
  // Avoid colliding with the SPA route `/assets` (nginx would 403 the real dir).
  build: {
    assetsDir: "static",
  },
  server: {
    port: 5173,
  },
});
