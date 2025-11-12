import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { PackageCard } from "../ui/PackageCard";
import { PricingToggle } from "../ui/PricingToggle";

type Package = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
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
    category?: string;
  }>;
};

export async function loader(_args: LoaderFunctionArgs) {
  // TODO: Replace with actual API call to back-api service
  // const response = await fetch('http://localhost:8000/user-subscription/packages');
  // const packages = await response.json();

  // Mock data for now
  const packages: Package[] = [
    {
      id: "1",
      slug: "free",
      name: "Free",
      description: "Perfect for trying out our platform",
      price_monthly: 0,
      price_yearly: 0,
      currency: "USD",
      rate_limit_per_hour: 10,
      rate_limit_per_day: 100,
      display_order: 1,
      metadata: {
        tagline: "Get started with essential tools",
        highlight: "Perfect for individuals",
        cta_text: "Start Free",
      },
      features: [
        {
          id: "basic_tools",
          name: "Basic Tools",
          description: "Access to core functionality",
          included: true,
          icon: "🔧",
          category: "tools",
        },
        {
          id: "community_support",
          name: "Community Support",
          description: "Help from our community",
          included: true,
          icon: "👥",
          category: "support",
        },
        {
          id: "1_workspace",
          name: "1 Workspace",
          description: "Single workspace for your projects",
          included: true,
          icon: "📁",
          category: "workspaces",
        },
      ],
    },
    {
      id: "2",
      slug: "standard",
      name: "Standard",
      description: "Great for individuals and small teams",
      price_monthly: 29.99,
      price_yearly: 299.0,
      currency: "USD",
      rate_limit_per_hour: 100,
      rate_limit_per_day: 2000,
      display_order: 2,
      metadata: {
        tagline: "Everything you need to grow",
        highlight: "Popular",
        cta_text: "Get Started",
      },
      features: [
        {
          id: "basic_tools",
          name: "Basic Tools",
          description: "Access to core functionality",
          included: true,
          icon: "🔧",
          category: "tools",
        },
        {
          id: "5_workspaces",
          name: "5 Workspaces",
          description: "Organize with multiple workspaces",
          included: true,
          icon: "📁",
          category: "workspaces",
        },
        {
          id: "api_access",
          name: "API Access",
          description: "Full API access",
          included: true,
          icon: "🔌",
          category: "api",
        },
        {
          id: "email_support",
          name: "Email Support",
          description: "Priority email support",
          included: true,
          icon: "📧",
          category: "support",
        },
      ],
    },
    {
      id: "3",
      slug: "premium",
      name: "Premium",
      description: "Advanced features for growing businesses",
      price_monthly: 79.99,
      price_yearly: 799.0,
      currency: "USD",
      rate_limit_per_hour: 500,
      rate_limit_per_day: 10000,
      display_order: 3,
      metadata: {
        tagline: "Advanced capabilities for professionals",
        highlight: "Best Value",
        cta_text: "Go Premium",
      },
      features: [
        {
          id: "advanced_tools",
          name: "Advanced Tools",
          description: "Professional-grade tools",
          included: true,
          icon: "⚡",
          category: "tools",
        },
        {
          id: "unlimited_workspaces",
          name: "Unlimited Workspaces",
          description: "Create as many workspaces as you need",
          included: true,
          icon: "📁",
          category: "workspaces",
        },
        {
          id: "priority_support",
          name: "Priority Support",
          description: "24/7 priority support",
          included: true,
          icon: "🚀",
          category: "support",
        },
        {
          id: "advanced_analytics",
          name: "Advanced Analytics",
          description: "Detailed insights and reports",
          included: true,
          icon: "📊",
          category: "analytics",
        },
        {
          id: "custom_integrations",
          name: "Custom Integrations",
          description: "Build custom integrations",
          included: true,
          icon: "🔗",
          category: "integrations",
        },
      ],
    },
    {
      id: "4",
      slug: "enterprise",
      name: "Enterprise",
      description: "Unlimited access with premium support",
      price_monthly: 299.99,
      price_yearly: 2999.0,
      currency: "USD",
      rate_limit_per_hour: 5000,
      rate_limit_per_day: 100000,
      display_order: 4,
      metadata: {
        tagline: "Maximum power and support",
        highlight: "For Large Organizations",
        cta_text: "Contact Sales",
      },
      features: [
        {
          id: "everything_premium",
          name: "Everything in Premium",
          description: "All premium features included",
          included: true,
          icon: "✨",
          category: "all",
        },
        {
          id: "dedicated_support",
          name: "Dedicated Support",
          description: "Dedicated account manager",
          included: true,
          icon: "👔",
          category: "support",
        },
        {
          id: "sla_guarantee",
          name: "SLA Guarantee",
          description: "99.9% uptime guarantee",
          included: true,
          icon: "⚖️",
          category: "reliability",
        },
        {
          id: "sso_saml",
          name: "SSO/SAML",
          description: "Single sign-on integration",
          included: true,
          icon: "🔐",
          category: "security",
        },
        {
          id: "white_label",
          name: "White Label",
          description: "Customize with your branding",
          included: true,
          icon: "🎨",
          category: "customization",
        },
      ],
    },
  ];

  return json({ packages });
}

export default function PricingPage() {
  const { packages } = useLoaderData<typeof loader>();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Select the perfect subscription for your needs. All plans include a 14-day free trial with no credit card required.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mb-16">
          <PricingToggle billingCycle={billingCycle} onToggle={setBillingCycle} />
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              billingCycle={billingCycle}
              highlighted={pkg.slug === "standard"}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-32 max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 mb-3">Can I change plans later?</h3>
              <p className="text-gray-600 leading-relaxed">Yes, you can upgrade or downgrade at any time. Changes take effect immediately.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 mb-3">What payment methods do you accept?</h3>
              <p className="text-gray-600 leading-relaxed">All major credit cards, PayPal, and bank transfers for enterprise plans.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 mb-3">Is there a setup fee?</h3>
              <p className="text-gray-600 leading-relaxed">No setup fees. You only pay for your selected plan with transparent pricing.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 mb-3">Can I cancel anytime?</h3>
              <p className="text-gray-600 leading-relaxed">Yes, cancel anytime with no questions asked. No penalties or fees.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
