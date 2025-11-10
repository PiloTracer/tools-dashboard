import { defineRoutes } from "@remix-run/dev";

export default defineRoutes((route) => {
  route("/features/user-management", "app/features/user-management/routes/index.tsx");
  route("/features/user-management/edit", "app/features/user-management/routes/edit.tsx");
  route("/features/task-scheduler", "app/features/task-scheduler/routes/index.tsx");
  route("/features/task-scheduler/create", "app/features/task-scheduler/routes/create.tsx");
});
