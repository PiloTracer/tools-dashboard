import { useTranslation } from "react-i18next";

export function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-inner">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{t("appLibrary.empty.title")}</h3>
      <p className="text-base text-gray-600 max-w-md mx-auto mb-6">{t("appLibrary.empty.description")}</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
        <p className="text-sm text-blue-800">
          <strong className="font-semibold">{t("appLibrary.empty.comingSoonTitle")}</strong>{" "}
          {t("appLibrary.empty.comingSoonBody")}
        </p>
      </div>
    </div>
  );
}
