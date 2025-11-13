import { useSubmit } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const submit = useSubmit();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;

    console.log("=== LANGUAGE SWITCH START ===");
    console.log("Current language:", i18n.language);
    console.log("New language:", newLanguage);

    // Submit to server immediately
    console.log("Submitting to server...");
    submit(
      { lng: newLanguage },
      { method: "post", action: "/app/change-language", replace: true }
    );
    console.log("Submit called");
  };

  return (
    <div className="language-switcher">
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
    </div>
  );
}
