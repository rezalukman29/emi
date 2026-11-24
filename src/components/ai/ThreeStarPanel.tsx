import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  EMPTY_BRIEF,
  analyzeEvent,
  markSuggestion,
  saveBrief,
  useThreeStar,
  type AnalysisClash,
  type AnalysisEvent,
  type AnalysisItem,
  type EventBrief,
  type Severity,
  type StarKey,
} from '../../lib/threeStar';
import { addDays, todayIso } from '../../data/eventChecklistMock';
import { takeIds, updateChecklist, useChecklistStore } from '../../lib/checklistStore';
import { currentUserName, isTenantAdminUser } from '../../lib/tenantUser';
import '../../threeStar.css';

// 3 Star Protection inside one event (owner 2026-11-24). PREVIEW: rule-based mock "AI", data in this browser.

export const STAR_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" /></svg>
);

export function StarRow({ earned, size = 'md' }: { earned: number; size?: 'sm' | 'md' }) {
  return (
    <span className={`ts-stars ${size}`} aria-label={`${earned}/3`}>
      {[0, 1, 2].map((i) => <span key={i} className={i < earned ? 'on' : ''}>{STAR_ICON}</span>)}
    </span>
  );
}

const STAR_ORDER: StarKey[] = ['brief', 'items', 'schedule'];
const SEV_ORDER: Severity[] = ['risk', 'warn', 'tip'];

export default function ThreeStarPanel({ event, items, clashes, onOpenItems, onOpenChecklist }: {
  event: AnalysisEvent;
  items: AnalysisItem[];
  clashes: AnalysisClash[];
  onOpenItems: () => void;
  onOpenChecklist: () => void;
}) {
  const { t, i18n } = useTranslation();
  const store = useThreeStar();
  const checklist = useChecklistStore();
  const settings = store.settings;
  const saved = store.briefs[event.id] ?? EMPTY_BRIEF;
  const handled = store.handled[event.id] ?? {};
  const [brief, setBrief] = useState<EventBrief>(saved);
  const [briefOpen, setBriefOpen] = useState(!store.briefs[event.id]);
  const [thinking, setThinking] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [showHandled, setShowHandled] = useState(false);
  const briefRef = useRef<HTMLElement>(null);

  useEffect(() => { setBrief(store.briefs[event.id] ?? EMPTY_BRIEF); }, [store.briefs, event.id]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const analysis = useMemo(() => analyzeEvent(event, items, saved, settings, todayIso(), clashes), [event, items, saved, settings, clashes, runKey]);
  const dirty = JSON.stringify({ ...brief, updatedAt: undefined }) !== JSON.stringify({ ...saved, updatedAt: undefined });
  const open = analysis.suggestions.filter((s) => !handled[s.id]);
  const done = analysis.suggestions.filter((s) => handled[s.id]);
  const aiGroup = checklist.groups.find((g) => g.eventId === event.id && g.name === t('threeStar.checklistGroup'));
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  const fmt = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  function rerun() {
    setThinking(true);
    window.setTimeout(() => { setRunKey((k) => k + 1); setThinking(false); }, 900);
  }

  function submitBrief() {
    saveBrief(event.id, brief);
    setBriefOpen(false);
    toast.success(t('threeStar.briefSaved'));
    rerun();
  }

  function openBrief() {
    setBriefOpen(true);
    window.setTimeout(() => briefRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function generateChecklist() {
    const me = currentUserName(t('eventChecklist.you'));
    const now = new Date().toISOString();
    const groupId = aiGroup?.id ?? takeIds();
    const firstId = takeIds(analysis.checklist.length);
    const existingTitles = new Set(checklist.items.filter((i) => i.groupId === groupId).map((i) => i.title));
    const tasks = analysis.checklist
      .map((task, index) => ({ task, index, title: t(`threeStar.tasks.${task.key}`, task.params) }))
      .filter(({ title }) => !existingTitles.has(title))
      .map(({ task, index, title }) => ({
        id: firstId + index, eventId: event.id, groupId, templateId: null, title,
        required: task.key === 'lockItems' || task.key === 'returnCheck',
        requiresPhoto: Boolean(task.requiresPhoto), requiresReport: Boolean(task.requiresReport),
        status: 'open' as const, note: '', photos: [],
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(event.start) ? addDays(event.start, task.dueOffsetDays) : null,
        assigneeId: null, assignee: null, statusBy: null, statusAt: null,
        activity: [{ at: now, by: '3 Star AI', action: 'created' as const, detail: 'ai' }],
      }));
    updateChecklist((current) => ({
      ...current,
      groups: aiGroup ? current.groups : [...current.groups, { id: groupId, eventId: event.id, name: t('threeStar.checklistGroup'), order: 0, templateGroupId: null }],
      items: [...current.items, ...tasks],
    }));
    toast.success(tasks.length ? t('threeStar.checklistAdded', { count: tasks.length, by: me }) : t('threeStar.checklistUpToDate'));
  }

  if (!settings.enabled) {
    return (
      <div className="card ts-off">
        <StarRow earned={0} />
        <h3>{t('threeStar.offTitle')}</h3>
        <p>{t('threeStar.offBody')}</p>
        {isTenantAdminUser() && <Link className="btn btn-primary" to="/ai/three-star">{t('threeStar.turnOn')}</Link>}
      </div>
    );
  }

  const sugTitle = (key: string, params?: Record<string, string | number>) => {
    const p = { ...params } as Record<string, string | number>;
    if (typeof p.from === 'string') p.from = fmt(p.from);
    if (typeof p.to === 'string') p.to = fmt(p.to);
    if (typeof p.fields === 'string') p.fields = String(p.fields).split(',').map((f) => t(`threeStar.brief.${f}`)).join(', ');
    if (typeof p.ground === 'string') p.ground = t(`threeStar.brief.groundOpt.${p.ground}`);
    return { title: t(`threeStar.sug.${key}.title`, p), detail: t(`threeStar.sug.${key}.detail`, p) };
  };
  const set = <K extends keyof EventBrief>(key: K, value: EventBrief[K]) => setBrief((b) => ({ ...b, [key]: value }));
  const outdoor = brief.venueType === 'outdoor';

  return (
    <div className={`ts-panel${thinking ? ' thinking' : ''}`}>
      <section className="card ts-hero">
        <div className="ts-hero-main">
          <span className="ts-ai-badge">{STAR_ICON} {t('threeStar.name')}</span>
          <div className="ts-score">
            <StarRow earned={analysis.earned} />
            <strong>{t('threeStar.scoreLine', { count: analysis.earned })}</strong>
          </div>
          <p className="ts-hero-sub">{thinking ? t('threeStar.thinking') : t('threeStar.heroSub', { open: open.length, count: open.length })}</p>
        </div>
        <div className="ts-hero-actions">
          <button type="button" className="btn btn-ghost" onClick={rerun} disabled={thinking}>{thinking ? t('threeStar.analyzing') : t('threeStar.reanalyze')}</button>
          <span className="ck-preview-badge" title={t('threeStar.previewHint')}>{t('threeStar.preview')}</span>
        </div>
        <div className="ts-star-tiles">
          {STAR_ORDER.map((key) => {
            const star = analysis.stars.find((s) => s.key === key)!;
            const count = open.filter((s) => s.star === key).length;
            return (
              <div key={key} className={`ts-tile${star.earned ? ' earned' : ''}${star.enabled ? '' : ' disabled'}`}>
                <span className="ts-tile-star">{STAR_ICON}</span>
                <div>
                  <b>{t(`threeStar.stars.${key}`)}</b>
                  <small>{!star.enabled ? t('threeStar.checkOff') : star.earned ? t('threeStar.passed') : t('threeStar.toFix', { count })}</small>
                </div>
                {key === 'brief' && star.enabled && <span className="ts-tile-meter"><i style={{ width: `${Math.round(analysis.briefCompleteness * 100)}%` }} /></span>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="ts-grid">
        <section className="card ts-suggestions" aria-label={t('threeStar.suggestionsTitle')}>
          <h3>{t('threeStar.suggestionsTitle')} <span className="stage-tab-count">{open.length}</span></h3>
          {open.length === 0 && <p className="ts-empty">{t('threeStar.allClear')}</p>}
          {SEV_ORDER.map((sev) => open.filter((s) => s.severity === sev).map((s) => {
            const text = sugTitle(s.key, s.params);
            return (
              <article key={s.id} className={`ts-sug ${s.severity}`}>
                <span className="ts-sev">{t(`threeStar.severity.${s.severity}`)}</span>
                <div className="ts-sug-body">
                  <b>{text.title}</b>
                  <p>{text.detail}</p>
                  <div className="ts-sug-actions">
                    {s.action === 'openBrief' && <button type="button" className="ts-link" onClick={openBrief}>{t('threeStar.fillBrief')}</button>}
                    {s.action === 'openItems' && <button type="button" className="ts-link" onClick={onOpenItems}>{t('threeStar.openItems')}</button>}
                    <button type="button" className="ts-link" onClick={() => markSuggestion(event.id, s.id, 'done')}>{t('threeStar.markDone')}</button>
                    <button type="button" className="ts-link muted" onClick={() => markSuggestion(event.id, s.id, 'dismissed')}>{t('threeStar.dismiss')}</button>
                  </div>
                </div>
                <span className="ts-sug-star">{t(`threeStar.stars.${s.star}`)}</span>
              </article>
            );
          }))}
          {done.length > 0 && (
            <button type="button" className="ts-link muted ts-handled-toggle" onClick={() => setShowHandled((v) => !v)}>
              {showHandled ? t('threeStar.hideHandled') : t('threeStar.showHandled', { count: done.length })}
            </button>
          )}
          {showHandled && done.map((s) => (
            <article key={s.id} className="ts-sug handled">
              <span className="ts-sev">{t(`threeStar.handled.${handled[s.id]}`)}</span>
              <div className="ts-sug-body"><b>{sugTitle(s.key, s.params).title}</b>
                <div className="ts-sug-actions"><button type="button" className="ts-link" onClick={() => markSuggestion(event.id, s.id, null)}>{t('threeStar.reopen')}</button></div>
              </div>
            </article>
          ))}
        </section>

        <aside className="ts-side">
          {settings.suggestChecklist && (
            <section className="card ts-checklist">
              <h3>{t('threeStar.checklistTitle')}</h3>
              <p>{t('threeStar.checklistBody', { count: analysis.checklist.length })}</p>
              <ul>
                {analysis.checklist.slice(0, 5).map((task) => <li key={task.key}>{t(`threeStar.tasks.${task.key}`, task.params)}</li>)}
                {analysis.checklist.length > 5 && <li className="more">{t('threeStar.andMore', { count: analysis.checklist.length - 5 })}</li>}
              </ul>
              <div className="ts-checklist-actions">
                <button type="button" className="btn btn-primary" onClick={generateChecklist}>{aiGroup ? t('threeStar.updateChecklist') : t('threeStar.generateChecklist')}</button>
                {aiGroup && <button type="button" className="btn btn-ghost" onClick={onOpenChecklist}>{t('threeStar.openChecklist')}</button>}
              </div>
            </section>
          )}
          <section className="card ts-context">
            <h3>{t('threeStar.readTitle')}</h3>
            <ul>
              <li><span>{t('threeStar.read.dates')}</span><b>{event.start ? `${fmt(event.start)}${event.end && event.end !== event.start ? ` – ${fmt(event.end)}` : ''}` : '—'}</b></li>
              <li><span>{t('threeStar.read.items')}</span><b>{items.length}</b></li>
              <li><span>{t('threeStar.read.venue')}</span><b>{event.address || '—'}</b></li>
              <li><span>{t('threeStar.read.brief')}</span><b>{Math.round(analysis.briefCompleteness * 100)}%</b></li>
            </ul>
          </section>
        </aside>
      </div>

      <section ref={briefRef} className="card ts-brief">
        <button type="button" className="ts-brief-head" aria-expanded={briefOpen} onClick={() => setBriefOpen((v) => !v)}>
          <span>
            <b>{t('threeStar.briefTitle')}</b>
            <small>{t('threeStar.briefSub')}</small>
          </span>
          <span className="ts-brief-pct">{Math.round(analysis.briefCompleteness * 100)}%</span>
        </button>
        {briefOpen && (
          <form className="ts-brief-form" onSubmit={(e) => { e.preventDefault(); submitBrief(); }}>
            <label className="ts-f"><span>{t('threeStar.brief.eventType')}</span>
              <select id="ts-type" value={brief.eventType} onChange={(e) => set('eventType', e.target.value as EventBrief['eventType'])}>
                <option value="">—</option>{['wedding', 'corporate', 'birthday', 'gala', 'exhibition', 'other'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.typeOpt.${v}`)}</option>)}
              </select></label>
            <label className="ts-f"><span>{t('threeStar.brief.guests')}</span><input id="ts-guests" type="number" min={0} inputMode="numeric" value={brief.guests} onChange={(e) => set('guests', e.target.value)} placeholder="250" /></label>
            <label className="ts-f"><span>{t('threeStar.brief.venueType')}</span>
              <select id="ts-venue" value={brief.venueType} onChange={(e) => set('venueType', e.target.value as EventBrief['venueType'])}>
                <option value="">—</option>{['indoor', 'outdoor', 'semi'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.venueOpt.${v}`)}</option>)}
              </select></label>
            {(outdoor || brief.venueType === 'semi') && <label className="ts-f"><span>{t('threeStar.brief.ground')}</span>
              <select id="ts-ground" value={brief.ground} onChange={(e) => set('ground', e.target.value as EventBrief['ground'])}>
                <option value="">—</option>{['grass', 'sand', 'floor', 'carpet'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.groundOpt.${v}`)}</option>)}
              </select></label>}
            {(outdoor || brief.venueType === 'semi') && <label className="ts-f"><span>{t('threeStar.brief.rainPlan')}</span>
              <select id="ts-rain" value={brief.rainPlan} onChange={(e) => set('rainPlan', e.target.value as EventBrief['rainPlan'])}>
                <option value="">—</option>{['tent', 'indoor', 'none'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.rainOpt.${v}`)}</option>)}
              </select></label>}
            <label className="ts-f"><span>{t('threeStar.brief.power')}</span>
              <select id="ts-power" value={brief.power} onChange={(e) => set('power', e.target.value as EventBrief['power'])}>
                <option value="">—</option>{['venue', 'genset', 'none'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.powerOpt.${v}`)}</option>)}
              </select></label>
            <label className="ts-f"><span>{t('threeStar.brief.loadIn')}</span><input id="ts-loadin" type="datetime-local" value={brief.loadIn} onChange={(e) => set('loadIn', e.target.value)} /></label>
            <label className="ts-f"><span>{t('threeStar.brief.eventStartTime')}</span><input id="ts-start" type="time" value={brief.eventStartTime} onChange={(e) => set('eventStartTime', e.target.value)} /></label>
            <label className="ts-f wide"><span>{t('threeStar.brief.style')}</span><input id="ts-style" value={brief.style} onChange={(e) => set('style', e.target.value)} placeholder={t('threeStar.brief.stylePh')} /></label>
            <label className="ts-f wide"><span>{t('threeStar.brief.colors')}</span><input id="ts-colors" value={brief.colors} onChange={(e) => set('colors', e.target.value)} placeholder={t('threeStar.brief.colorsPh')} /></label>
            <label className="ts-f full"><span>{t('threeStar.brief.priorities')}</span><textarea id="ts-prio" rows={3} value={brief.priorities} onChange={(e) => set('priorities', e.target.value)} placeholder={t('threeStar.brief.prioritiesPh')} /></label>
            <div className="ts-brief-actions full">
              <span>{t('threeStar.briefPrivacy')}</span>
              {dirty && <button type="button" className="btn btn-ghost" onClick={() => setBrief(saved)}>{t('eventChecklist.cancel')}</button>}
              <button type="submit" className="btn btn-primary" disabled={!dirty}>{t('threeStar.saveBrief')}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
