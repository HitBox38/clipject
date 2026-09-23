import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { crx, type ManifestV3Export } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import manifest from "./manifest.json" with { type: "json" };

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const firefox = mode === "firefox";
  const browserManifest: ManifestV3Export = firefox
    ? {
        ...manifest,
        background: {
          scripts: [manifest.background.service_worker],
          type: "module",
        },
        browser_specific_settings: {
          gecko: {
            id: "clipject@tomer-norman.dev",
            strict_min_version: "140.0",
            data_collection_permissions: { required: ["none"] },
          },
        },
      }
    : manifest;

  return {
    plugins: [
      react(),
      tailwindcss(),
      crx({ manifest: browserManifest, browser: firefox ? "firefox" : "chrome" }),
    ],
    build: {
      outDir: firefox ? "dist-firefox" : "dist",
      license: { fileName: "THIRD-PARTY-LICENSES.txt" },
    },
    server: {
      watch: {
        ignored: ["**/.tmp-ui/**", "**/.pnpm-store/**"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  };
});
