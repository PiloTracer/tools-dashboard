import type { FC } from "react";
import { Form } from "@remix-run/react";

type Package = {
  slug: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
};

type Props = {
  package: Package;
  billingCycle: "monthly" | "yearly";
};

export const CheckoutForm: FC<Props> = ({ package: pkg, billingCycle }) => {
  const price = billingCycle === "monthly" ? pkg.price_monthly : pkg.price_yearly;
  const periodLabel = billingCycle === "monthly" ? "month" : "year";

  return (
    <Form method="post" className="space-y-6">
      <input type="hidden" name="package_slug" value={pkg.slug} />
      <input type="hidden" name="billing_cycle" value={billingCycle} />

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100">
          Profile Information
        </h3>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
              Company <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="company"
              name="company"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-4 border-b-2 border-gray-100">
          Payment Information
        </h3>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-900">
            Payment integration is not yet active. This is a demonstration form.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-semibold text-gray-700 mb-2">
              Card Number
            </label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="expiry" className="block text-sm font-semibold text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="text"
                id="expiry"
                name="expiry"
                placeholder="MM/YY"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="cvv" className="block text-sm font-semibold text-gray-700 mb-2">
                CVV
              </label>
              <input
                type="text"
                id="cvv"
                name="cvv"
                placeholder="123"
                maxLength={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            name="terms"
            required
            className="mt-1 w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
            I agree to the <a href="/terms" className="text-blue-600 hover:underline font-semibold">Terms of Service</a> and{" "}
            <a href="/privacy" className="text-blue-600 hover:underline font-semibold">Privacy Policy</a>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        Start Free Trial — Then ${price.toFixed(2)}/{periodLabel}
      </button>
    </Form>
  );
};
