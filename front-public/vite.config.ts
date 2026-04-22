import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  build: {
    sourcemap: true,
  },
  // Docker nginx forwards the browser Host (e.g. dev.aiepic.app). Vite must accept it or
  // dev SSR / module requests can fail (often seen as 404 or blank page on non-localhost hosts).
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    remix({
      publicPath: "/app/build/",
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        // Direct hits to deep routes (e.g. /app/features/.../verify) can 404 in dev behind a
        // reverse proxy when discovery runs on a mismatched host; manifest mode is reliable.
        v3_lazyRouteDiscovery: false,
      },
    }),
  ],
});
