import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["routeTree.gen.ts", "packages/ui/src/components/ui"],
  sortPackageJson: { sortScripts: true },
  sortImports: {},
  sortTailwindcss: {},
});
