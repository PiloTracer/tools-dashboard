import { defineRoutes } from "@remix-run/dev";

export default defineRoutes((route) => {
  route("/admin/features/admin-signin", "app/features/admin-signin/routes/index.tsx");
  route("/admin/features/user-management", "app/features/user-management/routes/index.tsx");
  route("/admin/features/user-management/edit", "app/features/user-management/routes/edit.tsx");
  route("/admin/features/task-scheduler", "app/features/task-scheduler/routes/index.tsx");
  route("/admin/features/task-scheduler/create", "app/features/task-scheduler/routes/create.tsx");
});
