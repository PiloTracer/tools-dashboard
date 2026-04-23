import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "Task scheduler · Tools Dashboard Admin" },
  { name: "description", content: "Background and scheduled jobs (planned)." },
];

export default function TaskSchedulerIndex() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Task scheduler</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            This area is reserved for operating and inspecting <strong className="font-medium text-slate-800">background work</strong>{" "}
            (queues, retries, schedules) that today run in the stack via{" "}
            <strong className="font-medium text-slate-800">Celery</strong> and{" "}
            <strong className="font-medium text-slate-800">Redis</strong> (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">back-workers</code>
            ). Nothing here talks to the workers yet; the admin UI is a shell until an API exists.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
          Planned
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">What it will be for</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
            <li>See scheduled and ad-hoc jobs (name, cron or trigger, last run, failures)</li>
            <li>Pause or retry from the console when we expose safe controls</li>
            <li>Align with long-running tasks: email, exports, cleanup — not interactive product CRUD</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">What works today</h2>
          <p className="mt-3 text-sm text-slate-600">
            Workers and Redis are part of the docker stack; job code lives under{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">back-workers/</code>. There is{" "}
            <strong className="text-slate-800">no</strong> admin API to list or edit schedules from this screen yet.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-5 py-4 text-sm text-indigo-950">
        <strong className="font-semibold">Create / edit jobs</strong> — The old placeholder form has been removed. When this ships,
        creation will go through a real backend contract (validation, auth, audit), not a dummy POST.
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Admin overview
        </Link>
        <Link
          to="/admin/features/app-library"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Application library
        </Link>
      </div>
    </div>
  );
}
