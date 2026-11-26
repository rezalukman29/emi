import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Unknown address: say so, instead of silently jumping to Events (UX review 2026-11-26, REG-17).
export default function NotFoundPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <div className="card page-crash">
      <h2>{t('uxFix.notFoundTitle')}</h2>
      <p>{t('uxFix.notFoundBody', { path: pathname })}</p>
      <div className="page-crash-actions">
        <Link className="btn btn-primary" to="/dashboard">{t('uxFix.toDashboard')}</Link>
        <Link className="btn btn-ghost" to="/event">{t('uxFix.toEvents')}</Link>
      </div>
    </div>
  );
}
