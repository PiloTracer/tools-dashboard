import type { FC } from "react";

export const TaskForm: FC = () => (
  <form method="post">
    <label>
      Task Name
      <input type="text" name="name" required />
    </label>
    <label>
      Schedule
      <input type="text" name="schedule" required />
    </label>
    <button type="submit">Create Task</button>
  </form>
);
