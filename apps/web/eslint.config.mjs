import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ignore: build output, generated files, and seed scripts
  globalIgnores([
    // Build outputs
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma generated client (auto-generated, not our code)
    "lib/generated/**",
    // Database seed (dev-only utility, not production code)
    "prisma/seed.ts",
    // Scratch / temp files
    "scratch/**",
  ]),
]);

export default eslintConfig;
