import eslintPluginZod from "eslint-plugin-zod";
import type { DummyRuleMap } from "oxlint";
import { defineConfig } from "oxlint";

const oxlintZodRecommendedRules = {
  ...eslintPluginZod.configs.recommended.rules,
  "zod/consistent-schema-var-name": ["error", { after: "$" }],
} as DummyRuleMap;

export default defineConfig({
  ignorePatterns: ["routeTree.gen.ts", "packages/ui/src/components/ui"],
  options: { typeAware: true, typeCheck: true },
  jsPlugins: ["eslint-plugin-zod"],
  rules: {
    "no-unused-vars": "error",
    "no-console": "allow",
    "no-floating-promises": "allow",
    ...oxlintZodRecommendedRules,
  },
  plugins: ["eslint", "unicorn", "typescript", "oxc", "react", "react-perf"],
});
