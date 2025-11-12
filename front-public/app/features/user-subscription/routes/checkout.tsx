import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { CheckoutForm } from "../ui/CheckoutForm";
import { FeatureList } from "../ui/FeatureList";

type Package = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: Array<{
    id: string;
    name: string;
    description: string;
    included: boolean;
    icon?: string;
    category?: string;
  }>;
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;

  if (!slug) {
    throw new Response("Package not specified", { status: 400 });
  }

  // TODO: Replace with actual API call to back-api service
  // const response = await fetch(`http://localhost:8000/user-subscription/packages/${slug}`);
  // const packageData = await response.json();

  // Mock data for now - in production, fetch from API
  const packagesMap: Record<string, Package> = {
    free: {
      id: "1",
      slug: "free",
      name: "Free",
      description: "Perfect for trying out our platform",
      price_monthly: 0,
      price_yearly: 0,
      currency: "USD",
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
    standard: {
      id: "2",
      slug: "standard",
      name: "Standard",
      description: "Great for individuals and small teams",
      price_monthly: 29.99,
      price_yearly: 299.0,
      currency: "USD",
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
    premium: {
      id: "3",
      slug: "premium",
      name: "Premium",
      description: "Advanced features for growing businesses",
      price_monthly: 79.99,
      price_yearly: 799.0,
      currency: "USD",
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
    enterprise: {
      id: "4",
      slug: "enterprise",
      name: "Enterprise",
      description: "Unlimited access with premium support",
      price_monthly: 299.99,
      price_yearly: 2999.0,
      currency: "USD",
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
  };

  const packageData = packagesMap[slug];

  if (!packageData) {
    throw new Response("Package not found", { status: 404 });
  }

  return json({ package: packageData });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const subscriptionData = {
    package_slug: formData.get("package_slug"),
    billing_cycle: formData.get("billing_cycle"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    company: formData.get("company"),
  };

  // TODO: Send to back-api service to create subscription
  // const response = await fetch('http://localhost:8000/user-subscription/subscribe', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     user_id: 'current_user_id', // Get from session
  //     package_slug: subscriptionData.package_slug,
  //     billing_cycle: subscriptionData.billing_cycle,
  //     payment_method_id: 'stripe_payment_method_id',
  //   }),
  // });

  // For now, just redirect to a success page
  console.log("Subscription data:", subscriptionData);

  return redirect("/subscription/success");
}

export default function CheckoutPage() {
  const { package: pkg } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const billingCycle = (searchParams.get("billing") as "monthly" | "yearly") || "monthly";
  const price = billingCycle === "monthly" ? pkg.price_monthly : pkg.price_yearly;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Link to=".." className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-8 transition-colors">
          <span>←</span>
          <span>Back to Pricing</span>
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Complete Your Subscription
          </h1>
          <p className="text-xl text-gray-600">
            You're subscribing to the <span className="font-bold text-gray-900">{pkg.name}</span> plan
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CheckoutForm package={pkg} billingCycle={billingCycle} />
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-8 sticky top-4">
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100">
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg text-gray-900">{pkg.name} Plan</div>
                    <div className="text-sm text-gray-600 capitalize mt-1">{billingCycle} billing</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">${price.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">/{billingCycle === "monthly" ? "mo" : "yr"}</div>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-gray-100 pt-6 mb-6">
                <h4 className="font-bold text-gray-900 mb-4">What's Included</h4>
                <FeatureList features={pkg.features} showOnlyIncluded={true} />
              </div>

              <div className="border-t-2 border-gray-100 pt-6">
                <div className="flex justify-between mb-3">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">${price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold text-gray-900">$0.00</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-200 pt-4 mb-2">
                  <span className="font-bold text-lg text-gray-900">Total Due Today</span>
                  <span className="text-3xl font-bold text-blue-600">$0.00</span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <p className="text-sm font-medium text-green-800">
                    14-day free trial, then ${price.toFixed(2)}/{billingCycle === "monthly" ? "mo" : "yr"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
