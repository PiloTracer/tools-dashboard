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
  plugins: [
    remix({
      publicPath: "/app/build/",
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
  ],
});
