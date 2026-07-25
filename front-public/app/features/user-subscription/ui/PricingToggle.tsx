import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  billingCycle: "monthly" | "yearly";
  onToggle: (cycle: "monthly" | "yearly") => void;
};

export const PricingToggle: FC<Props> = ({ billingCycle, onToggle }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex rounded-lg bg-gray-100 p-1 shadow-inner">
        <button
          onClick={() => onToggle("monthly")}
          className={`px-8 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
            billingCycle === "monthly"
              ? "bg-white text-gray-900 shadow-md"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t("subscription.toggle.monthly")}
        </button>
        <button
          onClick={() => onToggle("yearly")}
          className={`px-8 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
            billingCycle === "yearly"
              ? "bg-white text-gray-900 shadow-md"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t("subscription.toggle.yearly")}
        </button>
      </div>
      {billingCycle === "yearly" && (
        <p className="text-sm font-medium text-green-600">{t("subscription.toggle.yearlySavings")}</p>
      )}
    </div>
  );
};
