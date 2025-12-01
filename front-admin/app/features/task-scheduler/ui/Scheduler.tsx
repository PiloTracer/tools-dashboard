import type { FC } from "react";

type Task = {
  id: string;
  name: string;
  schedule: string;
};

type Props = {
  tasks: Task[];
};

export const Scheduler: FC<Props> = ({ tasks }) => (
  <section>
    <h2>Scheduled Tasks</h2>
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          {task.name} — {task.schedule}
        </li>
      ))}
    </ul>
  </section>
);
