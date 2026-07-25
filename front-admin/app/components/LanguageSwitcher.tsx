import { useSubmit } from "@remix-run/react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const submit = useSubmit();

  const currentLang = i18n.language.split("-")[0];

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    if (newLanguage !== currentLang) {
      submit({ lng: newLanguage }, { method: "post", action: "/admin/change-language", replace: true });
    }
  };

  return (
    <div className="language-switcher" style={{ marginBottom: "12px" }}>
      <label htmlFor="admin-language-select" className="sr-only">
        {t("language.selector")}
      </label>
      <select
        id="admin-language-select"
        name="lng"
        value={currentLang}
        onChange={handleLanguageChange}
        className="language-select"
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid rgba(148,163,184,0.35)",
          background: "rgba(15,23,42,0.6)",
          color: "rgba(248,250,252,0.9)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <option value="en">{t("language.en")}</option>
        <option value="es">{t("language.es")}</option>
      </select>
    </div>
  );
}
