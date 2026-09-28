import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react()],
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup/common.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          environmentOptions: { jsdom: { url: "https://source.example/form" } },
          include: ["tests/dom/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/common.ts", "tests/setup/dom.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      thresholds: {
        statements: 58,
        branches: 56,
        functions: 47,
        lines: 60,
        "src/lib/{storage,import-validation,sharing,keys}.ts": {
          perFile: true,
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        "src/lib/paste.ts": {
          statements: 85,
          branches: 40,
          functions: 100,
          lines: 85,
        },
        "src/background/storage-mutations.ts": {
          statements: 90,
          branches: 75,
          functions: 100,
          lines: 95,
        },
      },
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/ui/**", "src/types/**", "src/**/types.ts"],
    },
  },
});
