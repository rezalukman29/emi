import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import ax from '../../service/axios';
import BriefFields from './BriefFields';
import {
  EMPTY_BRIEF,
  analyzeEvent,
  markSuggestion,
  saveBrief,
  saveScore,
  useThreeStar,
  type AnalysisClash,
  type AnalysisEvent,
  type AnalysisItem,
  type EventBrief,
  type StarKey,
  type Suggestion,
} from '../../lib/threeStar';
import { addDays, todayIso } from '../../data/eventChecklistMock';
import { takeIds, updateChecklist, useChecklistStore } from '../../lib/checklistStore';
import { currentUserName, isTenantAdminUser } from '../../lib/tenantUser';
import '../../threeStar.css';

// 3 Star Protection inside one event (owner 2026-11-24). PREVIEW: rule-based mock "AI", data in this browser.
// v2 after the UX roast: brief first, handled suggestions lift the stars, grouped per item, alternatives from
// the inventory, checklist due dates never in the past, analysis updates automatically.

export const STAR_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" /></svg>
);

export function StarRow({ earned, size = 'md', label }: { earned: number; size?: 'sm' | 'md'; label?: string }) {
  return (
    <span className={`ts-stars ${size}`} role="img" aria-label={label ?? `${earned}/3`}>
      {[0, 1, 2].map((i) => <span key={i} className={i < earned ? 'on' : ''}>{STAR_ICON}</span>)}
    </span>
  );
}

const STAR_ORDER: StarKey[] = ['brief', 'items', 'schedule'];
const TOP_LIMIT = 5;

/** Up to 3 items from the inventory matching a word (read-only reuse of GET /v2/barang-gudang/detail). */
function Alternatives({ search, exclude }: { search: string; exclude?: string }) {
  const { t } = useTranslation();
  const query = useQuery(['threeStarAlt', search], async () => {
    const response = await ax.get('/v2/barang-gudang/detail', { params: { page: 1, limit: 8, search } });
    return response.data;
  }, { staleTime: 5 * 60_000 });
  const rows = ((query.data?.data?.data ?? []) as Array<{ barang_id: number; nama_barang: string; warehouses?: Array<{ stok_gudang: number }> }>)
    .filter((row) => row.nama_barang !== exclude && row.nama_barang.toLowerCase().includes(search.toLowerCase()))
    .map((row) => ({ id: row.barang_id, name: row.nama_barang, stock: (row.warehouses ?? []).reduce((sum, w) => sum + (Number(w.stok_gudang) || 0), 0) }))
    .filter((row) => row.stock > 0)
    .slice(0, 3);
  if (query.isLoading) return <div className="ts-alt muted">{t('threeStar.altLoading')}</div>;
  if (!rows.length) return <div className="ts-alt muted">{t('threeStar.altNone', { word: search })}</div>;
  return (
    <div className="ts-alt">
      <span>{t('threeStar.altTitle')}</span>
      {rows.map((row) => <Link key={row.id} to={`/inventory-detail?id=${row.id}`}>{row.name} <b>{t('threeStar.altStock', { count: row.stock })}</b></Link>)}
    </div>
  );
}

export default function ThreeStarPanel({ event, items, clashes, onOpenItems, onOpenChecklist, onRent }: {
  event: AnalysisEvent;
  items: AnalysisItem[];
  clashes: AnalysisClash[];
  /** Opens the Items tab, filtered to this item name when given. */
  onOpenItems: (itemName?: string) => void;
  onOpenChecklist: () => void;
  /** Opens Rent Item for this event (only when the stage allows rentals). */
  onRent?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const store = useThreeStar();
  const checklist = useChecklistStore();
  const settings = store.settings;
  const hasBrief = Boolean(store.briefs[event.id]);
  const saved = store.briefs[event.id] ?? EMPTY_BRIEF;
  const handled = useMemo(() => store.handled[event.id] ?? {}, [store.handled, event.id]);
  const [brief, setBrief] = useState<EventBrief>(saved);
  const [briefOpen, setBriefOpen] = useState(false);
  const [skipSetup, setSkipSetup] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showHandled, setShowHandled] = useState(false);
  const [dismissing, setDismissing] = useState<{ id: string; reason: string; mode: 'dismissed' | 'done' } | null>(null);
  const briefRef = useRef<HTMLElement>(null);
  const me = currentUserName(t('eventChecklist.you'));
  const today = todayIso();

  useEffect(() => { setBrief(store.briefs[event.id] ?? EMPTY_BRIEF); }, [store.briefs, event.id]);

  const analysis = useMemo(() => analyzeEvent(event, items, saved, settings, today, clashes, handled), [event, items, saved, settings, today, clashes, handled]);
  const open = analysis.suggestions.filter((s) => !s.handled);
  const done = analysis.suggestions.filter((s) => s.handled);
  const risks = open.filter((s) => s.severity === 'risk').length;
  const setupMode = settings.enabled && !hasBrief && !skipSetup;

  useEffect(() => {
    if (settings.enabled && hasBrief) saveScore(event.id, { earned: analysis.earned, risks, open: open.length });
  }, [settings.enabled, hasBrief, event.id, analysis.earned, risks, open.length]);

  const dirty = JSON.stringify({ ...brief, updatedAt: undefined }) !== JSON.stringify({ ...saved, updatedAt: undefined });
  const aiGroup = checklist.groups.find((g) => g.eventId === event.id && g.name === t('threeStar.checklistGroup'));
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  const fmt = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const fmtTime = (iso: string) => new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function submitBrief(formEvent?: FormEvent) {
    formEvent?.preventDefault();
    saveBrief(event.id, brief);
    setBriefOpen(false);
    toast.success(t('threeStar.briefSaved'));
  }

  function openBrief() {
    setBriefOpen(true);
    window.setTimeout(() => briefRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function handle(sug: Suggestion, state: 'done' | 'dismissed', reason?: string) {
    markSuggestion(event.id, sug.id, { state, reason, by: me, at: new Date().toISOString(), fp: sug.fp });
    setDismissing(null);
  }

  function generateChecklist() {
    const now = new Date().toISOString();
    const groupId = aiGroup?.id ?? takeIds();
    const firstId = takeIds(analysis.checklist.length);
    const groupItems = checklist.items.filter((i) => i.groupId === groupId);
    const existingTitles = new Set(groupItems.map((i) => i.title));
    const existingKeys = new Set(groupItems.flatMap((i) => i.activity.map((a) => a.detail ?? '')).filter((d) => d.startsWith('ai:')).map((d) => d.slice(3)));
    const validStart = /^\d{4}-\d{2}-\d{2}$/.test(event.start);
    const tasks = analysis.checklist
      .map((task, index) => ({ task, index, title: t(`threeStar.tasks.${task.key}`, task.params) }))
      .filter(({ task, title }) => !existingTitles.has(title) && !existingKeys.has(task.key))
      .map(({ task, index, title }) => {
        // Never create a task that is already overdue: the earliest due date is today.
        const ideal = validStart ? addDays(event.start, task.dueOffsetDays) : null;
        const dueDate = ideal && ideal < today ? today : ideal;
        return {
          id: firstId + index, eventId: event.id, groupId, templateId: null, title,
          required: task.key === 'lockItems' || task.key === 'returnCheck',
          requiresPhoto: Boolean(task.requiresPhoto), requiresReport: Boolean(task.requiresReport),
          status: 'open' as const, note: '', photos: [], dueDate,
          assigneeId: null, assignee: null, statusBy: null, statusAt: null,
          activity: [{ at: now, by: '3 Star AI', action: 'created' as const, detail: `ai:${task.key}` }],
        };
      });
    updateChecklist((current) => ({
      ...current,
      groups: aiGroup ? current.groups : [...current.groups, { id: groupId, eventId: event.id, name: t('threeStar.checklistGroup'), order: 0, templateGroupId: null }],
      items: [...current.items, ...tasks],
    }));
    toast.success(tasks.length ? t('threeStar.checklistAdded', { count: tasks.length }) : t('threeStar.checklistUpToDate'));
  }

  if (!settings.enabled) {
    const admin = isTenantAdminUser();
    return (
      <div className="card ts-off">
        <StarRow earned={0} />
        <h3>{t('threeStar.offTitle')}</h3>
        <p>{admin ? t('threeStar.offBody') : t('threeStar.offBodyMember')}</p>
        {admin && <Link className="btn btn-primary" to="/ai/three-star">{t('threeStar.turnOn')}</Link>}
      </div>
    );
  }

  const sugText = (sug: Suggestion) => {
    const p = { ...sug.params } as Record<string, string | number>;
    if (typeof p.from === 'string') p.from = fmt(p.from);
    if (typeof p.to === 'string') p.to = fmt(p.to);
    if (typeof p.fields === 'string') p.fields = String(p.fields).split(',').map((f) => t(`threeStar.brief.${f}`)).join(', ');
    if (typeof p.ground === 'string') p.ground = t(`threeStar.brief.groundOpt.${p.ground}`);
    return { title: t(`threeStar.sug.${sug.key}.title`, p), detail: t(`threeStar.sug.${sug.key}.detail`, p) };
  };

  // Group item suggestions by item; others stay one card each. Order follows the worst severity.
  type Entry = { key: string; item?: string; list: Suggestion[] };
  const entries: Entry[] = [];
  for (const sug of open) {
    const existing = sug.itemName ? entries.find((e) => e.item === sug.itemName) : undefined;
    if (existing) existing.list.push(sug);
    else entries.push({ key: sug.itemName ? `item-${sug.itemName}` : sug.id, item: sug.itemName, list: [sug] });
  }
  const shown = showAll ? entries : entries.slice(0, TOP_LIMIT);

  const renderSug = (sug: Suggestion, compact = false) => {
    const text = sugText(sug);
    return (
      <div key={sug.id} className={`ts-sug ${sug.severity}${compact ? ' compact' : ''}`}>
        <span className="ts-sev">{t(`threeStar.severity.${sug.severity}`)}</span>
        <div className="ts-sug-body">
          <b>{text.title}</b>
          <p>{text.detail}</p>
          {!compact && sug.altSearch && <Alternatives search={sug.altSearch} exclude={sug.itemName} />}
          {sug.changedSinceHandled && <p className="ts-changed">{t('threeStar.changedSince')}</p>}
          {dismissing?.id === sug.id ? (
            <form className="ts-dismiss" onSubmit={(e) => { e.preventDefault(); if (dismissing.reason.trim()) handle(sug, dismissing.mode, dismissing.reason.trim()); }}>
              <input autoFocus value={dismissing.reason} onChange={(e) => setDismissing({ ...dismissing, reason: e.target.value })} placeholder={dismissing.mode === 'done' ? t('threeStar.doneNotePh') : t('threeStar.dismissReasonPh')} aria-label={dismissing.mode === 'done' ? t('threeStar.doneNote') : t('threeStar.dismissReason')} />
              <button type="submit" className="btn btn-primary" disabled={!dismissing.reason.trim()}>{dismissing.mode === 'done' ? t('threeStar.markDone') : t('threeStar.dismiss')}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setDismissing(null)}>{t('eventChecklist.cancel')}</button>
            </form>
          ) : (
            <div className="ts-sug-actions">
              {sug.action === 'openBrief' && <button type="button" className="ts-link" onClick={openBrief}>{t('threeStar.fillBrief')}</button>}
              {!compact && (sug.action === 'openItems' || sug.itemName) && <button type="button" className="ts-link" onClick={() => onOpenItems(sug.itemName)}>{sug.itemName ? t('threeStar.openItem') : t('threeStar.openItems')}</button>}
              {sug.action === 'rent' && onRent && <button type="button" className="ts-link" onClick={onRent}>{t('threeStar.rentShort')}</button>}
              <button type="button" className="ts-link" onClick={() => (sug.severity === 'risk' ? setDismissing({ id: sug.id, reason: '', mode: 'done' }) : handle(sug, 'done'))}>{t('threeStar.markDone')}</button>
              <button type="button" className="ts-link muted" onClick={() => setDismissing({ id: sug.id, reason: '', mode: 'dismissed' })}>{t('threeStar.dismiss')}</button>
            </div>
          )}
        </div>
        {!compact && <span className="ts-sug-star">{t(`threeStar.stars.${sug.star}`)}</span>}
      </div>
    );
  };

  const briefCard = (
    <section ref={briefRef} className={`card ts-brief${setupMode ? ' setup' : ''}`}>
      {setupMode ? (
        <div className="ts-brief-head static">
          <span><b>{t('threeStar.setupTitle')}</b><small>{t('threeStar.setupSub')}</small></span>
        </div>
      ) : (
        <button type="button" className="ts-brief-head" aria-expanded={briefOpen} onClick={() => setBriefOpen((v) => !v)}>
          <span><b>{t('threeStar.briefTitle')}</b><small>{saved.updatedAt ? t('threeStar.briefUpdated', { date: fmtTime(saved.updatedAt) }) : t('threeStar.briefSub')}</small></span>
          <span className="ts-brief-pct">{Math.round(analysis.briefCompleteness * 100)}%</span>
        </button>
      )}
      {(setupMode || briefOpen) && (
        <form className="ts-brief-form" onSubmit={submitBrief}>
          <BriefFields brief={brief} onChange={setBrief} />
          <div className="ts-brief-actions">
            <span>{t('threeStar.briefPrivacy')}</span>
            {setupMode && <button type="button" className="btn btn-ghost" onClick={() => setSkipSetup(true)}>{t('threeStar.skipSetup')}</button>}
            {!setupMode && dirty && <button type="button" className="btn btn-ghost" onClick={() => setBrief(saved)}>{t('eventChecklist.cancel')}</button>}
            <button type="submit" className="btn btn-primary" disabled={!setupMode && !dirty}>{setupMode ? t('threeStar.saveAndAnalyze') : t('threeStar.saveBrief')}</button>
          </div>
        </form>
      )}
    </section>
  );

  return (
    <div className="ts-panel">
      <section className="card ts-hero">
        <div className="ts-hero-main">
          <span className="ts-ai-badge">{STAR_ICON} {t('threeStar.name')}</span>
          {setupMode ? (
            <>
              <div className="ts-score"><StarRow earned={0} /><strong>{t('threeStar.setupScore')}</strong></div>
              <p className="ts-hero-sub">{t('threeStar.setupHint')}</p>
            </>
          ) : (
            <>
              <div className="ts-score">
                <StarRow earned={analysis.earned} label={t('threeStar.scoreLine', { count: analysis.earned })} />
                <strong>{t('threeStar.scoreLine', { count: analysis.earned })}</strong>
              </div>
              <p className="ts-hero-sub">{open.length ? t('threeStar.heroSub', { count: open.length, risks }) : t('threeStar.allClear')}</p>
            </>
          )}
        </div>
        <div className="ts-hero-actions">
          <span className="ts-auto">{t('threeStar.autoUpdate')}</span>
          <span className="ck-preview-badge" title={t('threeStar.previewHint')}>{t('threeStar.preview')}</span>
        </div>
        {!setupMode && (
          <div className="ts-star-tiles">
            {STAR_ORDER.map((key) => {
              const star = analysis.stars.find((s) => s.key === key)!;
              const count = open.filter((s) => s.star === key).length;
              const manual = done.filter((s) => s.star === key && s.severity !== 'tip').length;
              return (
                <div key={key} className={`ts-tile${star.earned ? ' earned' : ''}${star.enabled ? '' : ' disabled'}`}>
                  <span className="ts-tile-star">{STAR_ICON}</span>
                  <div>
                    <b>{t(`threeStar.stars.${key}`)}</b>
                    <small>{!star.enabled ? t('threeStar.checkOff') : star.earned ? (count ? t('threeStar.passedWithTips', { count }) : t('threeStar.passed')) : t('threeStar.toFix', { count })}</small>
                    {star.enabled && manual > 0 && <small className="ts-manual">{t('threeStar.manualConfirmed', { count: manual })}</small>}
                  </div>
                  {key === 'brief' && star.enabled && <span className="ts-tile-meter"><i style={{ width: `${Math.round(analysis.briefCompleteness * 100)}%` }} /></span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {setupMode && briefCard}

      {!setupMode && (
        <div className="ts-grid">
          <section className="card ts-suggestions" aria-label={t('threeStar.suggestionsTitle')}>
            <h3>{t('threeStar.suggestionsTitle')} <span className="stage-tab-count">{open.length}</span></h3>
            {open.length === 0 && <p className="ts-empty">{t('threeStar.allClear')}</p>}
            {shown.map((entry) => (entry.list.length > 1 ? (
              <article key={entry.key} className={`ts-item-group ${entry.list[0].severity}`}>
                <header>
                  <b>{entry.item}</b>
                  <span>{t('threeStar.itemNotes', { count: entry.list.length })}</span>
                  <button type="button" className="ts-link" onClick={() => onOpenItems(entry.item)}>{t('threeStar.openItem')}</button>
                </header>
                {(() => { const alt = entry.list.find((x) => x.altSearch)?.altSearch; return alt ? <Alternatives search={alt} exclude={entry.item} /> : null; })()}
                {entry.list.map((sug) => renderSug(sug, true))}
              </article>
            ) : renderSug(entry.list[0])))}
            {entries.length > TOP_LIMIT && (
              <button type="button" className="ts-link ts-more" onClick={() => setShowAll((v) => !v)}>
                {showAll ? t('threeStar.showLess') : t('threeStar.showAll', { count: entries.length - TOP_LIMIT })}
              </button>
            )}
            {done.length > 0 && (
              <button type="button" className="ts-link muted ts-handled-toggle" onClick={() => setShowHandled((v) => !v)}>
                {showHandled ? t('threeStar.hideHandled') : t('threeStar.showHandled', { count: done.length })}
              </button>
            )}
            {showHandled && done.map((sug) => (
              <div key={sug.id} className="ts-sug handled">
                <span className="ts-sev">{t(`threeStar.handled.${sug.handled!.state}`)}</span>
                <div className="ts-sug-body">
                  <b>{sugText(sug).title}</b>
                  <p className="ts-handled-by">
                    {sug.handled!.by && t('threeStar.handledBy', { name: sug.handled!.by, date: sug.handled!.at ? fmtTime(sug.handled!.at) : '' })}
                    {sug.handled!.reason && <> · “{sug.handled!.reason}”</>}
                  </p>
                  <div className="ts-sug-actions"><button type="button" className="ts-link" onClick={() => markSuggestion(event.id, sug.id, null)}>{t('threeStar.reopen')}</button></div>
                </div>
              </div>
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
      )}

      {!setupMode && briefCard}
    </div>
  );
}
