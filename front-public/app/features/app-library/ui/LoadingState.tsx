import { useTranslation } from "react-i18next";

export function LoadingState() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse"
          aria-label={t("appLibrary.loadingAria")}
        >
          <div className="bg-gradient-to-br from-gray-200 to-gray-300 h-36" />
          <div className="p-6">
            <div className="h-6 bg-gray-200 rounded-md mb-3" />
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
            <div className="flex gap-2 mb-4">
              <div className="h-5 w-16 bg-gray-200 rounded-md" />
              <div className="h-5 w-20 bg-gray-200 rounded-md" />
            </div>
            <div className="h-11 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
