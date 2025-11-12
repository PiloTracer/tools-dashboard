import { Form } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <Form method="post" action="/app/change-language" className="language-switcher">
      <label htmlFor="language-select" className="sr-only">
        {t("language.selector")}
      </label>
      <select
        id="language-select"
        name="lng"
        value={i18n.language}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="language-select"
      >
        <option value="en">{t("language.en")}</option>
        <option value="es">{t("language.es")}</option>
      </select>
    </Form>
  );
}
