import { useEffect, useRef, useState } from "react";
import { IconGlobe } from "./icons";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = window.localStorage.getItem("emi-language");
    return saved === "id" ? "id" : "en";
  });
  const wrapRef = useRef<HTMLDivElement>(null);
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

  const selectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    window.localStorage.setItem("emi-language", code);
    setOpen(false);
  };

  return (
    <div className="lang-switcher" ref={wrapRef}>
      <button
        type="button"
        className="header-btn lang-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
        title="Language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <IconGlobe />
        <span className="lang-switcher-code">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-switcher-menu" role="listbox" aria-label="Language">
          {LANGUAGES.map((item) => (
            <button
              type="button"
              role="option"
              aria-selected={item.code === language}
              key={item.code}
              className={`lang-switcher-item${item.code === language ? " selected" : ""}`}
              onClick={() => selectLanguage(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
