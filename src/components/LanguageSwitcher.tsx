import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconGlobe } from "./icons";
import { LANGUAGE_STORAGE_KEY, type SupportedLanguage } from "../i18n";

const LANGUAGES = [
  { code: "en", labelKey: "language.english" },
  { code: "id", labelKey: "language.indonesian" },
] as const;

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const language: SupportedLanguage = i18n.resolvedLanguage === "id" ? "id" : "en";
  const current = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  const selectLanguage = (code: SupportedLanguage) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="lang-switcher" ref={wrapRef}>
      <button
        type="button"
        className="header-btn lang-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
        title={t("header.language")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <IconGlobe />
        <span className="lang-switcher-code">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-switcher-menu" role="listbox" aria-label={t("header.language")}>
          {LANGUAGES.map((item) => (
            <button
              type="button"
              role="option"
              aria-selected={item.code === language}
              key={item.code}
              className={`lang-switcher-item${item.code === language ? " selected" : ""}`}
              onClick={() => selectLanguage(item.code)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
