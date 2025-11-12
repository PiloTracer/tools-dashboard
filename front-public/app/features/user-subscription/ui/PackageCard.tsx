import type { FC } from "react";
import { Link } from "@remix-run/react";

type Package = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  display_order: number;
  metadata: {
    tagline?: string;
    highlight?: string;
    cta_text?: string;
  };
  features: Array<{
    id: string;
    name: string;
    description: string;
    included: boolean;
    icon?: string;
  }>;
};

type Props = {
  package: Package;
  billingCycle: "monthly" | "yearly";
  highlighted?: boolean;
};

export const PackageCard: FC<Props> = ({ package: pkg, billingCycle, highlighted = false }) => {
  const price = billingCycle === "monthly" ? pkg.price_monthly : pkg.price_yearly;
  const periodLabel = billingCycle === "monthly" ? "/month" : "/year";
  const includedFeatures = pkg.features.filter((f) => f.included);
  const ctaText = pkg.metadata.cta_text || "Get Started";

  return (
    <div
      className={`relative rounded-xl p-8 bg-white shadow-md border-2 transition-all duration-200 hover:shadow-xl ${
        highlighted
          ? "border-blue-500 ring-2 ring-blue-100"
          : "border-gray-200 hover:border-blue-200"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md whitespace-nowrap">
            {pkg.metadata.highlight || "Popular"}
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{pkg.name}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {pkg.metadata.tagline || pkg.description}
        </p>
      </div>

      <div className="text-center mb-8 pb-8 border-b-2 border-gray-100">
        <div className="mb-2">
          <span className="text-5xl font-bold text-gray-900">
            ${Math.floor(price)}
          </span>
          {price % 1 !== 0 && (
            <span className="text-2xl font-bold text-gray-600">
              .{String(price.toFixed(2)).split('.')[1]}
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-gray-600">{periodLabel}</div>
      </div>

      <Link
        to={`${pkg.slug}?billing=${billingCycle}`}
        className={`block w-full text-center py-3.5 rounded-lg font-semibold transition-all duration-200 mb-8 ${
          highlighted
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
            : "bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg"
        }`}
      >
        {ctaText}
      </Link>

      <div className="space-y-3">
        {includedFeatures.map((feature) => (
          <div key={feature.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
              </div>
            </div>
            <span className="text-sm text-gray-700 leading-relaxed">{feature.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
