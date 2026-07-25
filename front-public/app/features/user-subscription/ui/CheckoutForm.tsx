import type { FC } from "react";
import { Form } from "@remix-run/react";
import { Trans, useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const price = billingCycle === "monthly" ? pkg.price_monthly : pkg.price_yearly;
  const periodLabel =
    billingCycle === "monthly" ? t("subscription.checkout.periodMonth") : t("subscription.checkout.periodYear");

  return (
    <Form method="post" className="space-y-6">
      <input type="hidden" name="package_slug" value={pkg.slug} />
      <input type="hidden" name="billing_cycle" value={billingCycle} />

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100">
          {t("subscription.checkout.profileInformation")}
        </h3>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                {t("subscription.checkout.firstName")} {t("subscription.checkout.requiredField")}
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
                {t("subscription.checkout.lastName")} {t("subscription.checkout.requiredField")}
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
              {t("subscription.checkout.email")} {t("subscription.checkout.requiredField")}
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
              {t("subscription.checkout.company")}{" "}
              <span className="text-gray-400 font-normal">{t("subscription.checkout.companyOptional")}</span>
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
          {t("subscription.checkout.paymentInformation")}
        </h3>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-900">{t("subscription.checkout.paymentDemoNotice")}</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-semibold text-gray-700 mb-2">
              {t("subscription.checkout.cardNumber")}
            </label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              placeholder={t("subscription.checkout.cardNumberPlaceholder")}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="expiry" className="block text-sm font-semibold text-gray-700 mb-2">
                {t("subscription.checkout.expiry")}
              </label>
              <input
                type="text"
                id="expiry"
                name="expiry"
                placeholder={t("subscription.checkout.expiryPlaceholder")}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="cvv" className="block text-sm font-semibold text-gray-700 mb-2">
                {t("subscription.checkout.cvv")}
              </label>
              <input
                type="text"
                id="cvv"
                name="cvv"
                placeholder={t("subscription.checkout.cvvPlaceholder")}
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
            <Trans
              i18nKey="subscription.checkout.termsAgreement"
              components={{
                1: (
                  <a href="/terms" className="text-blue-600 hover:underline font-semibold">
                    {t("subscription.checkout.termsOfService")}
                  </a>
                ),
                2: (
                  <a href="/privacy" className="text-blue-600 hover:underline font-semibold">
                    {t("subscription.checkout.privacyPolicy")}
                  </a>
                ),
              }}
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {t("subscription.checkout.submitButton", { price: price.toFixed(2), period: periodLabel })}
      </button>
    </Form>
  );
};
