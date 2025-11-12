import type { FC } from "react";

type Feature = {
  id: string;
  name: string;
  description: string;
  included: boolean;
  icon?: string;
  category?: string;
};

type Props = {
  features: Feature[];
  showOnlyIncluded?: boolean;
};

export const FeatureList: FC<Props> = ({ features, showOnlyIncluded = false }) => {
  const displayFeatures = showOnlyIncluded
    ? features.filter((f) => f.included)
    : features;

  return (
    <ul className="space-y-3">
      {displayFeatures.map((feature) => (
        <li
          key={feature.id}
          className={`flex items-start gap-3 ${
            !feature.included ? "opacity-50" : ""
          }`}
        >
          <span className="text-xl mt-0.5">{feature.icon || "✓"}</span>
          <div className="flex-1">
            <p className={`font-medium ${!feature.included ? "line-through" : ""}`}>
              {feature.name}
            </p>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};
