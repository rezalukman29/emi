import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function UpgradeCTA() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="upgrade-cta"
      onClick={() => navigate("/upgrade")}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
      {t("header.upgrade")}
    </button>
  );
}
