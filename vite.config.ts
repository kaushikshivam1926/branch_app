import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { viteSingleFile } from "vite-plugin-singlefile";

// Support three build modes:
// - Development (default): Code-splitting for faster dev builds & better caching
// - Deployment: Single-file for offline file:// access (users can double-click index.html)
// - Modular: Modular chunks with code-splitting for offline via HTTP server (recommended)
const isDeploymentBuild = process.env.BUILD_MODE === "deployment";
const isModularBuild = process.env.BUILD_MODE === "modular";
const plugins = isDeploymentBuild
  ? [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), viteSingleFile()]
  : [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    cssCodeSplit: !isDeploymentBuild, // Split CSS for modular/dev
    // For deployment: inline all assets into single file
    // For modular/dev: keep assets separate for efficient caching
    assetsInlineLimit: isDeploymentBuild ? Infinity : 0,
    rollupOptions: {
      output: {
        // Inline everything in deployment mode (handled by viteSingleFile)
        // Keep separate chunks in modular/dev mode for better caching
        inlineDynamicImports: isDeploymentBuild,
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true, // Fail if 3000 is busy to avoid running multiple dev versions
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
