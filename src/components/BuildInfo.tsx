import { useTranslation } from 'react-i18next';
import { version } from '../../package.json';

/**
 * Small muted block at the bottom of the sidebars: app version, the branch this build came
 * from and its last commit. Values are injected at build time (see vite.config.js).
 */
export default function BuildInfo({ label }: { label?: string }) {
  const { t, i18n } = useTranslation();
  const info = __BUILD_INFO__;
  const dateIso = info.commitDate ?? info.builtAt;
  const date = new Date(dateIso).toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const tooltip = [
    `${t('buildInfo.branch')}: ${info.branch}`,
    `${t('buildInfo.commit')}: ${info.commit}${info.commitMessage ? ` — ${info.commitMessage}` : ''}`,
    info.commitAuthor && `${t('buildInfo.author')}: ${info.commitAuthor}`,
    `${info.commitDate ? t('buildInfo.updated') : t('buildInfo.built')}: ${new Date(dateIso).toLocaleString()}`,
  ].filter(Boolean).join('\n');

  return (
    <div className="sidebar-version" title={tooltip}>
      <span className="sidebar-version-top">
        <span className="sidebar-version-number">v{version}</span>
        {label && <span className="sidebar-build-label">{label}</span>}
      </span>
      <span className="sidebar-build-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
        <span className="sidebar-build-branch">{info.branch}</span>
      </span>
      <span className="sidebar-build-row">
        {info.commit} · {info.commitDate ? t('buildInfo.updatedShort', { date }) : t('buildInfo.builtShort', { date })}
      </span>
    </div>
  );
}
