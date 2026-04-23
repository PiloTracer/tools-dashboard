import { defineRoutes } from "@remix-run/dev";

export default defineRoutes((route) => {
  route("/admin/features/user-management", "app/features/user-management/routes/index.tsx");
  route("/admin/features/user-management/edit", "app/features/user-management/routes/edit.tsx");
});
