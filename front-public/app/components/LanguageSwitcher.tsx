import { useSubmit } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const submit = useSubmit();

  // Normalize language to base code (en-US -> en)
  const currentLang = i18n.language.split('-')[0];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;

    console.log("=== LANGUAGE SWITCH START ===");
    console.log("Current language:", i18n.language, "Normalized:", currentLang);
    console.log("New language:", newLanguage);

    // Only submit if actually changing
    if (newLanguage !== currentLang) {
      console.log("Submitting to server...");
      submit(
        { lng: newLanguage },
        { method: "post", action: "/app/change-language", replace: true }
      );
      console.log("Submit called");
    } else {
      console.log("Same language, skipping submit");
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
