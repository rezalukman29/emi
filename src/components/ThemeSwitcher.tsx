import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { IconMonitor, IconMoon, IconSun } from "./icons";
import { useTheme, type ThemePreference } from "../lib/theme";

const OPTIONS: { value: ThemePreference; labelKey: string; Icon: () => ReactElement }[] = [
  { value: "light", labelKey: "theme.light", Icon: IconSun },
  { value: "dark", labelKey: "theme.dark", Icon: IconMoon },
  { value: "system", labelKey: "theme.system", Icon: IconMonitor },
];

/** Header dropdown next to the language switcher: Light / Dark / System. */
export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, resolved, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  // The button shows what is on screen now (sun or moon), also when following the system.
  const TriggerIcon = resolved === "dark" ? IconMoon : IconSun;

  return (
    <div className="lang-switcher theme-switcher" ref={wrapRef}>
      <button
        type="button"
        className="header-btn"
        onClick={() => setOpen((value) => !value)}
        title={t("theme.label")}
        aria-label={t("theme.label")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <TriggerIcon />
      </button>
      {open && (
        <div className="lang-switcher-menu" role="listbox" aria-label={t("theme.label")}>
          {OPTIONS.map(({ value, labelKey, Icon }) => (
            <button
              type="button"
              role="option"
              aria-selected={value === preference}
              key={value}
              className={`lang-switcher-item theme-switcher-item${value === preference ? " selected" : ""}`}
              onClick={() => {
                setPreference(value);
                setOpen(false);
              }}
            >
              <Icon />
              <span>{t(labelKey)}</span>
              {value === "system" && <span className="theme-switcher-hint">{t(resolved === "dark" ? "theme.nowDark" : "theme.nowLight")}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
