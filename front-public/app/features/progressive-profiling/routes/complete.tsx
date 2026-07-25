import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";

import { usePublicHref } from "../../../components/layout/PublicLayout";

export default function ProfilingComplete() {
  const { t } = useTranslation();
  const dashboardHref = usePublicHref("/");

  return (
    <main className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">{t("profiling.complete.title")}</h1>
      <p className="text-base text-slate-600">{t("profiling.complete.description")}</p>
      <Link to={dashboardHref} className="btn-solid inline-flex">
        {t("profiling.complete.goToDashboard")}
      </Link>
    </main>
  );
}
