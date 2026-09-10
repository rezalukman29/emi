import { useTranslation } from "react-i18next";
export default function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t("wording.thisFeatureIsComingSoon")}</p>
      </div>
    </>
  );
}
