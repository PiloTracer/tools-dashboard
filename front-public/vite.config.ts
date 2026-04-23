import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import path from "path";

/** Dev server absolute URL (no :8082) when the browser uses https://dev.aiepic.app via host nginx. */
function viteDevOrigin(): string | undefined {
  const raw = process.env.PUBLIC_APP_BASE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

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
    origin: viteDevOrigin(),
  },
  plugins: [
    remix({
      publicPath: "/app/build/",
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        // Off: v3_singleFetch + subpath (/app) can request loader data outside the nginx /app/ proxy
        // (browser "Failed to fetch"), e.g. after logout full navigation to /app.
        v3_singleFetch: false,
        // Direct hits to deep routes (e.g. /app/features/.../verify) can 404 in dev behind a
        // reverse proxy when discovery runs on a mismatched host; manifest mode is reliable.
        v3_lazyRouteDiscovery: false,
      },
    }),
  ],
});
