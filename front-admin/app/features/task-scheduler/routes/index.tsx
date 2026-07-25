import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Trans, useTranslation } from "react-i18next";

export const meta: MetaFunction = () => [
  { title: "Task scheduler · Tools Dashboard Admin" },
  { name: "description", content: "Background and scheduled jobs (planned)." },
];

export default function TaskSchedulerIndex() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {t("taskScheduler.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            <Trans
              i18nKey="taskScheduler.description"
              components={[
                <strong className="font-medium text-slate-800" key="bg" />,
                <strong className="font-medium text-slate-800" key="celery" />,
                <strong className="font-medium text-slate-800" key="redis" />,
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm" key="workers" />,
              ]}
            />
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
          {t("taskScheduler.planned")}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">{t("taskScheduler.future.title")}</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
            <li>{t("taskScheduler.future.item1")}</li>
            <li>{t("taskScheduler.future.item2")}</li>
            <li>{t("taskScheduler.future.item3")}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">{t("taskScheduler.today.title")}</h2>
          <p className="mt-3 text-sm text-slate-600">
            <Trans
              i18nKey="taskScheduler.today.description"
              components={[
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs" key="workers" />,
                <strong className="text-slate-800" key="no" />,
              ]}
            />
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-5 py-4 text-sm text-indigo-950">
        <Trans
          i18nKey="taskScheduler.notice"
          components={[<strong className="font-semibold" key="title" />]}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {t("taskScheduler.links.overview")}
        </Link>
        <Link
          to="/admin/features/app-library"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          {t("taskScheduler.links.appLibrary")}
        </Link>
      </div>
    </div>
  );
}
