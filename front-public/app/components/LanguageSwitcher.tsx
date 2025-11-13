import { Form } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;

    // Immediately change language on client side for instant feedback
    await i18n.changeLanguage(newLanguage);

    // Then submit form to persist on server
    e.currentTarget.form?.requestSubmit();
  };

  return (
    <Form method="post" action="/app/change-language" className="language-switcher">
      <label htmlFor="language-select" className="sr-only">
        {t("language.selector")}
      </label>
      <select
        id="language-select"
        name="lng"
        value={i18n.language}
        onChange={handleLanguageChange}
        className="language-select"
      >
        <option value="en">{t("language.en")}</option>
        <option value="es">{t("language.es")}</option>
      </select>
    </Form>
  );
}
