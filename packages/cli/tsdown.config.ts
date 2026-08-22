import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node20",
  fixedExtension: false,
  sourcemap: true,
  banner: "#!/usr/bin/env node",
});
