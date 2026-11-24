import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconArrowLeft } from '../components/icons';
import { STAR_ICON } from '../components/ai/ThreeStarPanel';
import { DEFAULT_THREE_STAR, LIMITS, saveThreeStarSettings, useThreeStar, type StarKey, type Strictness, type ThreeStarSettings } from '../lib/threeStar';
import { isTenantAdminUser } from '../lib/tenantUser';
import '../eventChecklist.css';
import '../threeStar.css';

// 3 Star Protection settings (owner 2026-11-24): enable/disable and tune the AI assistant. Preview, per browser.

export default function ThreeStarSettingsPage() {
  const { t } = useTranslation();
  const { settings: saved } = useThreeStar();
  const [draft, setDraft] = useState<ThreeStarSettings>(saved);
  const isAdmin = isTenantAdminUser();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const k = (key: string, opts?: Record<string, unknown>) => t(`threeStar.settings.${key}`, opts);
  const patch = (next: Partial<ThreeStarSettings>) => setDraft((d) => ({ ...d, ...next }));

  function save() { saveThreeStarSettings(draft); toast.success(k('saved')); }

  return (
    <div className="ts-settings">
      <Link to="/ai-tools" className="cks-back"><IconArrowLeft /> {t('aiTools.title')}</Link>

      <section className="ts-intro">
        <div className="ts-intro-text">
          <span className="ts-ai-badge">{STAR_ICON} {t('aiTools.badge')}</span>
          <h1>{t('threeStar.name')}</h1>
          <p>{k('intro')}</p>
          <div className="ts-intro-row">
            <label className="ts-master">
              <input className="es-switch" type="checkbox" role="switch" checked={draft.enabled} disabled={!isAdmin} onChange={(e) => patch({ enabled: e.target.checked })} />
              <span><b>{draft.enabled ? k('on') : k('off')}</b><small>{draft.enabled ? k('onHint') : k('offHint')}</small></span>
            </label>
            <span className="ck-preview-badge" title={t('threeStar.previewHint')}>{t('threeStar.preview')}</span>
          </div>
          {!isAdmin && <p className="ts-admin-note">{k('adminOnly')}</p>}
        </div>
        <ol className="ts-how">
          {(['brief', 'items', 'schedule'] as StarKey[]).map((key) => (
            <li key={key}>
              <span className="ts-how-star">{STAR_ICON}</span>
              <div><b>{t(`threeStar.stars.${key}`)}</b><span>{k(`explain.${key}`)}</span></div>
            </li>
          ))}
        </ol>
      </section>

      <fieldset className="ts-fieldset" disabled={!isAdmin || !draft.enabled}>
        <section className="card cks-group">
          <h2>{k('checksTitle')}</h2>
          {(['brief', 'items', 'schedule'] as StarKey[]).map((key) => (
            <div key={key} className="cks-row">
              <label className="cks-row-main">
                <span className="cks-row-text"><strong>{t(`threeStar.stars.${key}`)}</strong><span>{k(`check.${key}`)}</span></span>
                <input className="es-switch" type="checkbox" role="switch" checked={draft.checks[key]} onChange={(e) => patch({ checks: { ...draft.checks, [key]: e.target.checked } })} />
              </label>
            </div>
          ))}
        </section>

        <section className="card cks-group">
          <h2>{k('tuneTitle')}</h2>
          <div className="cks-row">
            <div className="cks-choice">
              <span>{k('strictness')}</span>
              <div className="ck-segment" role="radiogroup" aria-label={k('strictness')}>
                {(['relaxed', 'balanced', 'strict'] as Strictness[]).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={draft.strictness === v} className={draft.strictness === v ? 'active' : ''} onClick={() => patch({ strictness: v })}>{k(`strict.${v}`)}</button>
                ))}
              </div>
            </div>
            <p className="cks-note">{k(`strictHint.${draft.strictness}`)}</p>
          </div>
          <div className="cks-row ts-numbers">
            <label className="cks-number"><span>{k('minLeadDays')}</span><input id="ts-lead" type="number" min={1} max={120} value={draft.minLeadDays} onChange={(e) => patch({ minLeadDays: Math.min(120, Math.max(1, Number(e.target.value) || 1)) })} /></label>
            <label className="cks-number"><span>{k('setupHours')}</span><input id="ts-setup" type="number" min={1} max={72} value={draft.setupHours} onChange={(e) => patch({ setupHours: Math.min(72, Math.max(1, Number(e.target.value) || 1)) })} /></label>
          </div>
          <p className="cks-note ts-effective">{k('effective', { days: Math.round(draft.minLeadDays * LIMITS[draft.strictness].tight), min: draft.minLeadDays, level: k(`strict.${draft.strictness}`), hours: draft.setupHours })}</p>
          <div className="cks-row">
            <label className="cks-row-main">
              <span className="cks-row-text"><strong>{k('suggestChecklist')}</strong><span>{k('suggestChecklistHint')}</span></span>
              <input className="es-switch" type="checkbox" role="switch" checked={draft.suggestChecklist} onChange={(e) => patch({ suggestChecklist: e.target.checked })} />
            </label>
          </div>
          <div className="cks-row">
            <div className="cks-choice">
              <span>{k('audience')}</span>
              <div className="ck-segment" role="radiogroup" aria-label={k('audience')}>
                {(['everyone', 'admins'] as const).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={draft.audience === v} className={draft.audience === v ? 'active' : ''} onClick={() => patch({ audience: v })}>{k(`aud.${v}`)}</button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </fieldset>

      <section className="card ts-example">
        <h2>{k('exampleTitle')}</h2>
        <article className="ts-sug warn">
          <span className="ts-sev">{t('threeStar.severity.warn')}</span>
          <div className="ts-sug-body"><b>{t('threeStar.sug.roundTableGround.title', { item: 'Meja Bulat', ground: t('threeStar.brief.groundOpt.grass') })}</b><p>{t('threeStar.sug.roundTableGround.detail', { item: 'Meja Bulat', ground: t('threeStar.brief.groundOpt.grass') })}</p></div>
          <span className="ts-sug-star">{t('threeStar.stars.items')}</span>
        </article>
        <article className="ts-sug risk">
          <span className="ts-sev">{t('threeStar.severity.risk')}</span>
          <div className="ts-sug-body"><b>{t('threeStar.sug.tooTight.title', { days: 5, min: draft.minLeadDays })}</b><p>{t('threeStar.sug.tooTight.detail', { days: 5, min: draft.minLeadDays })}</p></div>
          <span className="ts-sug-star">{t('threeStar.stars.schedule')}</span>
        </article>
        <p className="cks-note">{k('whereShown')}</p>
      </section>

      {isAdmin && (
        <>
          <div className={`cks-savebar${dirty ? ' visible' : ''}`} aria-hidden={!dirty}>
            <span>{t('checklistSettings.unsaved')}</span>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(saved)} tabIndex={dirty ? 0 : -1}>{t('checklistSettings.discard')}</button>
            <button type="button" className="btn btn-primary" onClick={save} tabIndex={dirty ? 0 : -1}>{t('checklistSettings.save')}</button>
          </div>
          <button type="button" className="cks-reset" onClick={() => setDraft(DEFAULT_THREE_STAR)} disabled={JSON.stringify(draft) === JSON.stringify(DEFAULT_THREE_STAR)}>{t('checklistSettings.resetDefaults')}</button>
        </>
      )}
    </div>
  );
}
