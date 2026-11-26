import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return <div className="card"><h1>404</h1><p>{t('recovery.notFound')}</p><Link to="/dashboard">{t('recovery.dashboard')}</Link></div>;
}
