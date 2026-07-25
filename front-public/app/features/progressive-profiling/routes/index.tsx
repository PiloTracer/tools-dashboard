import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export async function loader(_args: LoaderFunctionArgs) {
  const isComplete = false;
  if (!isComplete) {
    return json({ stage: "basic" });
  }
  return redirect("/dashboard");
}

export default function ProgressiveProfilingIndex() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{t("profiling.index.title")}</h1>
        <p className="text-base text-slate-600">{t("profiling.index.description")}</p>
      </header>

      <Form method="post" className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
            {t("profiling.index.fullName")}
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">
            {t("profiling.index.timezone")}
          </label>
          <input
            id="timezone"
            type="text"
            name="timezone"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <button type="submit" className="btn-solid">
          {t("profiling.index.continue")}
        </button>
      </Form>

      <p className="text-sm text-slate-500">Current stage: {data.stage}</p>
    </main>
  );
}
