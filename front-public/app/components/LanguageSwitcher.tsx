import { useSubmit } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const submit = useSubmit();

  const currentLang = i18n.language.split("-")[0];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    if (newLanguage !== currentLang) {
      submit({ lng: newLanguage }, { method: "post", action: "/app/change-language", replace: true });
    }
  };

  return (
    <div className="language-switcher">
      <label htmlFor="language-select" className="sr-only">
        {t("language.selector")}
      </label>
      <select
        id="language-select"
        name="lng"
        value={currentLang}
        onChange={handleLanguageChange}
        className="language-select"
      >
        <option value="en">{t("language.en")}</option>
        <option value="es">{t("language.es")}</option>
      </select>
    </div>
  );
}
