import { useTranslation } from 'react-i18next';
export default function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return <div role="alert" style={{ padding: 20 }}><p>{t('recovery.loadFailed')}</p><button type="button" className="btn btn-ghost" onClick={onRetry}>{t('recovery.retry')}</button></div>;
}
