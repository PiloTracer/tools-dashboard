import { useTranslation } from "react-i18next";

export function LogoutMessage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-600 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">{t("logout.title")}</h1>
      <p>{t("logout.message")}</p>
    </div>
  );
}
