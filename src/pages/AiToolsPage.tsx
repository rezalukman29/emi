import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { STAR_ICON } from '../components/ai/ThreeStarPanel';
import { useThreeStar } from '../lib/threeStar';
import '../threeStar.css';

// AI Tools hub (owner 2026-11-24): AI gets its own home instead of a plain sidebar link.

export default function AiToolsPage() {
  const { t } = useTranslation();
  const { settings } = useThreeStar();
  return (
    <div className="ai-hub">
      <section className="ai-hub-hero">
        <span className="ts-ai-badge">{STAR_ICON} {t('aiTools.badge')}</span>
        <h1>{t('aiTools.title')}</h1>
        <p>{t('aiTools.intro')}</p>
      </section>
      <div className="ai-hub-grid">
        <Link to="/ai/three-star" className="ai-tool-card featured">
          <span className="ai-tool-icon star">{STAR_ICON}</span>
          <span className="ai-tool-new">{t('aiTools.new')}</span>
          <h2>{t('threeStar.name')}</h2>
          <p>{t('aiTools.threeStarDesc')}</p>
          <span className={`ai-tool-status${settings.enabled ? ' on' : ''}`}>{settings.enabled ? t('aiTools.on') : t('aiTools.off')}</span>
        </Link>
        <Link to="/ai-material-analyzer" className="ai-tool-card">
          <span className="ai-tool-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" /></svg></span>
          <h2>{t('navigation.items.materialAnalyzer')}</h2>
          <p>{t('aiTools.materialDesc')}</p>
          <span className="ai-tool-status on">{t('aiTools.open')}</span>
        </Link>
      </div>
      <p className="ai-hub-note">{t('aiTools.note')}</p>
    </div>
  );
}
