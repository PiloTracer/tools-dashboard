import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import routes from "./react-router.config";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    remix({
      publicPath: "/admin/build/",
      routes,
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
