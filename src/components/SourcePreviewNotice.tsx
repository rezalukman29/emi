import { useTranslation } from 'react-i18next';
export default function SourcePreviewNotice() {
  const { t } = useTranslation();
  return <p className="prod-notice prod-notice-info">{t('sourceUpgrade.preview')}</p>;
}
