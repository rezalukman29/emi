import { useState, useMemo, useRef } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { IconClose, IconPrint } from './icons';
import { useTranslation } from 'react-i18next';
import { fmtNum } from '../lib/format';

// Styles for the printed sheet. Every rule is scoped to .pp-*, so the same string is
// used for the in-app preview (inside a <style> tag) and for the print iframe.
const PRINT_CSS = `
.pp-sheet { font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111827; font-size: 12px; }
.pp-head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 12px; }
.pp-title { font-size: 18px; font-weight: 800; margin: 0 0 2px; }
.pp-event { font-size: 13px; font-weight: 700; }
.pp-meta { font-size: 11px; color: #4b5563; line-height: 1.6; }
.pp-meta-right { text-align: right; }
.pp-summary { display: flex; gap: 18px; flex-wrap: wrap; font-size: 11.5px; margin-bottom: 14px; color: #374151; }
.pp-summary strong { color: #111827; }
.pp-loc { margin-bottom: 18px; break-inside: avoid-page; }
.pp-loc.pp-break { break-before: page; }
.pp-loc-head { display: flex; justify-content: space-between; align-items: baseline; background: #eef2ff; border-left: 4px solid #4f46e5; padding: 6px 10px; margin-bottom: 6px; }
.pp-loc-name { font-size: 13px; font-weight: 800; letter-spacing: .03em; }
.pp-loc-count { font-size: 11px; color: #4b5563; }
.pp-sub { font-size: 11px; font-weight: 700; color: #4b5563; margin: 8px 0 4px; text-transform: uppercase; letter-spacing: .04em; }
.pp-table { width: 100%; border-collapse: collapse; }
.pp-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 5px 6px; }
.pp-table td { border-bottom: 1px solid #e5e7eb; padding: 6px; vertical-align: top; }
.pp-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pp-muted { color: #6b7280; font-size: 10.5px; }
.pp-box { width: 14px; height: 14px; border: 1.5px solid #374151; border-radius: 3px; display: inline-block; }
.pp-sign { display: flex; gap: 40px; margin-top: 26px; }
.pp-sign div { flex: 1; border-top: 1px solid #9ca3af; padding-top: 4px; font-size: 10.5px; color: #4b5563; }
.pp-empty { padding: 30px; text-align: center; color: #6b7280; }
`;



// Event Detail ⋮ → Print Plan: a printable list of what has to be prepared for each
// location (Area) of the event. The user picks which locations, which items, and which
// columns; the preview is exactly what gets printed (copied into a hidden iframe).
export default function PrintPlanModal({ eventName, eventSeed, currentStage, stages, items, printedBy, onClose }) {
  const { t, i18n } = useTranslation();
  const SCOPES = [{ value: 'upto', label: t('printPlan.upto') }, { value: 'all', label: t('printPlan.allItems') }];
  const stageIndex = stages.indexOf(currentStage);
  const [areas, setAreas] = useState([]); // empty = every location
  const [scope, setScope] = useState('upto');
  const [cols, setCols] = useState({ warehouse: true, ownership: true, pic: true, note: true });
  const [pageBreak, setPageBreak] = useState(false);
  const previewRef = useRef(null);

  
  const scoped = useMemo(
    () => scope === 'all' ? items : items.filter(it => stages.indexOf(it.stage) >= 0 && stages.indexOf(it.stage) <= stageIndex),
    [items, scope, stages, stageIndex]
  );
  const areaOptions = useMemo(() => {
    const counts = new Map();
    scoped.forEach(it => counts.set(it.area || 'UNASSIGNED', (counts.get(it.area || 'UNASSIGNED') || 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([a, n]) => ({ value: a, label: a, meta: String(n) }));
  }, [scoped]);

  // Location → sub area → items, sorted by name.
  const groups = useMemo(() => {
    const chosen = scoped.filter(it => areas.length === 0 || areas.includes(it.area || 'UNASSIGNED'));
    const byArea = new Map();
    chosen.forEach(it => {
      const area = it.area || 'UNASSIGNED';
      if (!byArea.has(area)) byArea.set(area, new Map());
      const subs = byArea.get(area);
      const sub = it.subArea || '';
      if (!subs.has(sub)) subs.set(sub, []);
      subs.get(sub).push(it);
    });
    return [...byArea.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([area, subs]) => {
      const subList = [...subs.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([sub, list]) => ({ sub, items: [...list].sort((a, b) => a.name.localeCompare(b.name)) }));
      const all = subList.flatMap(s => s.items);
      return { area, subs: subList, count: all.length, qty: all.reduce((s, it) => s + Number(it.qty || 0), 0) };
    });
  }, [scoped, areas]);

  const totalItems = groups.reduce((s, g) => s + g.count, 0);
  const totalQty = groups.reduce((s, g) => s + g.qty, 0);
  const printedAt = new Date().toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-GB', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const colCount = 5 + Object.values(cols).filter(Boolean).length; // #, item, category, qty, prepared + optional
  const toggleCol = key => setCols(c => ({ ...c, [key]: !c[key] }));

  function print() {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print Plan — ${eventName.replace(/</g, '&lt;')}</title>
      <style>@page { size: A4; margin: 14mm; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } ${PRINT_CSS}</style>
      </head><body>${previewRef.current.innerHTML}</body></html>`);
    doc.close();
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  }

  return (
    <Modal
      open
      size="3xl"
      title={t('october.printPlan')}
      onClose={onClose}
      footer={
        <>
          <button className="btn-cancel-modal" onClick={onClose}><IconClose /> {t('printPlan.close')}</button>
          <button className="btn-save-modal" onClick={print} disabled={totalItems === 0}><IconPrint /> {t('wording.print')}</button>
        </>
      }
    >
      <div className="pp-options">
        <div className="form-group">
          <label>{t('printPlan.location')}</label>
          <SearchableSelect multiple value={areas} onChange={setAreas} options={areaOptions}
            placeholder={t('printPlan.allLocations')} searchPlaceholder={t('wording.search')} />
        </div>
        <div className="form-group">
          <label>{t('october.items')}</label>
          <SearchableSelect value={scope} onChange={setScope} options={SCOPES} />
        </div>
        <div className="pp-options-wide">
          <div className="pp-checks-label">{t('printPlan.show')}</div>
          <div className="pp-checks">
            {[['warehouse', 'Warehouse'], ['ownership', 'Ownership'], ['pic', 'PIC'], ['note', 'Note']].map(([k, l]) => (
              <label key={k} className="pp-check"><input type="checkbox" checked={cols[k]} onChange={() => toggleCol(k)} /> {t(`printPlan.${k}`)}</label>
            ))}
            <label className="pp-check"><input type="checkbox" checked={pageBreak} onChange={() => setPageBreak(p => !p)} /> {t('printPlan.pageBreak')}</label>
          </div>
        </div>
      </div>

      <div className="pp-preview-label">{t('printPlan.preview')}</div>
      <div className="pp-preview">
        <style>{PRINT_CSS}</style>
        <div ref={previewRef}>
          <div className="pp-sheet">
            <div className="pp-head">
              <div>
                <p className="pp-title">{t('printPlan.title')}</p>
                <div className="pp-event">{eventSeed?.name || eventName.split(' | ').slice(1).join(' | ') || eventName}</div>
                <div className="pp-meta">
                  {eventSeed ? `${eventSeed.start}${eventSeed.finish && eventSeed.finish !== eventSeed.start ? ` – ${eventSeed.finish}` : ''} · ${eventSeed.location}` : eventName}
                  <br />{t('printPlan.stage')}: {currentStage}
                </div>
              </div>
              <div className="pp-meta pp-meta-right">
                {t('printPlan.printed')} {printedAt} WIB<br />{t('printPlan.by')} {printedBy}<br />
                {areas.length === 0 ? t('printPlan.allLocations') : `${fmtNum(areas.length)} ${t('printPlan.locations')}`}
              </div>
            </div>
            <div className="pp-summary">
              <span><strong>{fmtNum(groups.length)}</strong> {t('printPlan.locations')}</span>
              <span><strong>{fmtNum(totalItems)}</strong> {t('october.lines')}</span>
              <span><strong>{fmtNum(totalQty)}</strong> {t('printPlan.totalUnits')}</span>
              <span>{SCOPES.find(s => s.value === scope)?.label}</span>
            </div>

            {groups.length === 0 && <div className="pp-empty">{t('printPlan.noItems')}</div>}
            {groups.map((g, gi) => {
              let n = 0;
              return (
                <div key={g.area} className={`pp-loc${pageBreak && gi > 0 ? ' pp-break' : ''}`}>
                  <div className="pp-loc-head">
                    <span className="pp-loc-name">{g.area}</span>
                    <span className="pp-loc-count">{fmtNum(g.count)} {t('october.items')} · {fmtNum(g.qty)} pcs</span>
                  </div>
                  <table className="pp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 22 }}>#</th>
                        <th>{t('october.item')}</th>
                        <th>{t('printPlan.category')}</th>
                        <th className="pp-num">Qty</th>
                        {cols.warehouse && <th>{t('october.warehouse')}</th>}
                        {cols.ownership && <th>{t('printPlan.ownership')}</th>}
                        {cols.pic && <th>PIC</th>}
                        {cols.note && <th>{t('printPlan.note')}</th>}
                        <th style={{ width: 54, textAlign: 'center' }}>{t('printPlan.ready')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.subs.map(s => [
                        s.sub ? <tr key={`sub-${s.sub}`}><td colSpan={colCount}><div className="pp-sub">{s.sub}</div></td></tr> : null,
                        ...s.items.map(it => {
                          const cat = it;
                          n += 1;
                          return (
                            <tr key={it.id}>
                              <td className="pp-muted">{n}</td>
                              <td><strong>{it.name}</strong>{cat?.sku && <div className="pp-muted">{cat.sku}</div>}</td>
                              <td>{it.category || '—'}</td>
                              <td className="pp-num"><strong>{fmtNum(it.qty)}</strong> {cat?.unit || ''}</td>
                              {cols.warehouse && <td>{it.warehouses || it.warehouse || '—'}</td>}
                              {cols.ownership && <td>{it.ownerships?.join(', ') || '—'}</td>}
                              {cols.pic && <td>{it.pic || '—'}</td>}
                              {cols.note && <td className="pp-muted">{it.note || ''}</td>}
                              <td style={{ textAlign: 'center' }}><span className="pp-box" /></td>
                            </tr>
                          );
                        }),
                      ])}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {groups.length > 0 && (
              <div className="pp-sign">
                <div>{t('printPlan.preparedBy')}</div>
                <div>{t('printPlan.checkedBy')}</div>
                <div>{t('printPlan.received')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

