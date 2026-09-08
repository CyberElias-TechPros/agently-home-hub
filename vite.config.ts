/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Development is served through the sandbox preview proxy, whose hostname
    // is not known ahead of time. `allowedHosts` only relaxes Vite's host
    // check for `vite dev`; it has no effect on production builds.
    allowedHosts: true,
    host: "0.0.0.0",
    port: 8080,
    // The app always calls /api on its own origin; in development that is
    // forwarded to the local Worker so the two setups behave identically.
    proxy: {
      "/api": {
        target: process.env.WORKER_URL ?? "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // jsdom is enough for component behaviour; there is no browser available
    // in CI images, and these tests assert logic rather than layout.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
  build: {
    target: "es2020",
    sourcemap: mode === "development",
    // No manualChunks: route-level dynamic imports already split the bundle,
    // and hand-writing groups caused vendor code (React itself) to be pulled
    // into the leaflet chunk, which every route then had to download.
    chunkSizeWarningLimit: 700,
  },
}));
