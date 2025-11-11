import { defineConfig } from "@remix-run/dev";
import routes from "./react-router.config";

export default defineConfig({
  publicPath: "/admin/build/",
  assetsBuildDirectory: "public/build/admin",
  routes,
});
