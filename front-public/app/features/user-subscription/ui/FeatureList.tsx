import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Feature = {
  id: string;
  name: string;
  description: string;
  included: boolean;
  icon?: string;
  category?: string;
};

type Props = {
  packageSlug: string;
  features: Feature[];
  showOnlyIncluded?: boolean;
};

function packageTranslationSlug(slug: string): string {
  return slug === "premium" ? "pro" : slug;
}

function featureTranslationKey(featureId: string): string {
  const map: Record<string, string> = {
    "1_workspace": "oneWorkspace",
    "5_workspaces": "fiveWorkspaces",
  };
  return map[featureId] ?? featureId.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export const FeatureList: FC<Props> = ({ packageSlug, features, showOnlyIncluded = false }) => {
  const { t } = useTranslation();
  const slug = packageTranslationSlug(packageSlug);
  const displayFeatures = showOnlyIncluded ? features.filter((f) => f.included) : features;

  return (
    <ul className="space-y-3">
      {displayFeatures.map((feature) => {
        const featureKey = featureTranslationKey(feature.id);
        return (
          <li key={feature.id} className={`flex items-start gap-3 ${!feature.included ? "opacity-50" : ""}`}>
            <span className="text-xl mt-0.5">{feature.icon || "✓"}</span>
            <div className="flex-1">
              <p className={`font-medium ${!feature.included ? "line-through" : ""}`}>
                {t(`subscription.packages.${slug}.features.${featureKey}.name`)}
              </p>
              <p className="text-sm text-gray-600">
                {t(`subscription.packages.${slug}.features.${featureKey}.description`)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
