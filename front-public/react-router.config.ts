import { defineRoutes } from "@remix-run/dev";

export default defineRoutes((route) => {
  route("/features/user-registration", "app/features/user-registration/routes/index.tsx");
  route("/features/user-registration/verify", "app/features/user-registration/routes/verify.tsx");
  route("/features/progressive-profiling", "app/features/progressive-profiling/routes/index.tsx");
  route("/features/progressive-profiling/complete", "app/features/progressive-profiling/routes/complete.tsx");
});
