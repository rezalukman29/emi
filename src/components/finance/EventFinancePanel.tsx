import { useState, type FormEvent } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Modal from '../Modal';
import {
  EMPTY_FINANCE,
  addDays,
  fetchAutoCosts,
  invoiceState,
  nextId,
  nextInvoiceNo,
  paidOf,
  rupiah,
  summarize,
  totalOf,
  updateEventFinance,
  useFinance,
  type ExtraCharge,
  type Invoice,
  type ManualCost,
} from '../../lib/financeStore';
import { currentUserName } from '../../lib/tenantUser';
import '../../finance.css';

// "Keuangan" tab of one event (owner 2026-11-26) — PREVIEW. Vendor costs are real; the rest is in this browser.

const today = () => new Date().toISOString().slice(0, 10);
const COST_CATS: ManualCost['category'][] = ['transport', 'crew', 'production', 'consumption', 'other'];
const EXTRA_TYPES: ExtraCharge['type'][] = ['broken', 'lost', 'late', 'other'];

function MoneyInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <span className="fin-money"><i>Rp</i>
      <input id={id} inputMode="numeric" value={value ? Number(value).toLocaleString('id-ID') : ''} placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </span>
  );
}

export default function EventFinancePanel({ event }: { event: { id: number; name: string; start: string; end: string; address: string } }) {
  const { t, i18n } = useTranslation();
  const store = useFinance();
  const f = store.events[event.id] ?? EMPTY_FINANCE;
  const autoQuery = useQuery(['financeAutoCosts'], fetchAutoCosts, { staleTime: 60_000 });
  const auto = autoQuery.data?.[event.id];
  const now = today();
  const sum = summarize(f, auto, now);
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  const fmt = (iso: string) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  const [contract, setContract] = useState(f.contract ? String(f.contract) : '');
  const [client, setClient] = useState(f.clientName);
  const [plan, setPlan] = useState({ dp: '50', dpDue: now, finalDays: '7', tax: true });
  const [cost, setCost] = useState<{ category: ManualCost['category']; amount: string; note: string }>({ category: 'transport', amount: '', note: '' });
  const [extra, setExtra] = useState<{ type: ExtraCharge['type']; description: string; amount: string }>({ type: 'broken', description: '', amount: '' });
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [pay, setPay] = useState({ amount: '', date: now, method: 'transfer', note: '' });
  const [viewing, setViewing] = useState<Invoice | null>(null);

  // Never schedule an invoice in the past (e.g. invoicing an event that already happened).
  const idealFinal = event.start ? addDays(event.start, -Number(plan.finalDays || 0)) : now;
  const finalDue = idealFinal < now ? addDays(now, 7) : idealFinal;

  function saveContract(e: FormEvent) {
    e.preventDefault();
    updateEventFinance(event.id, (x) => ({ ...x, contract: Number(contract) || 0, clientName: client.trim() }));
    toast.success(t('fin.saved'));
  }

  function createSchedule() {
    const base = f.contract;
    if (!base) { toast.error(t('fin.needContract')); return; }
    const dpPct = Math.min(100, Math.max(0, Number(plan.dp) || 0));
    const rate = plan.tax ? f.taxRate : 0;
    const make = (label: string, amount: number, due: string): Invoice => ({ id: nextId(), no: nextInvoiceNo(), label, amount, tax: Math.round((amount * rate) / 100), due, status: 'draft', payments: [], createdAt: new Date().toISOString(), kind: 'term' });
    const dpAmount = Math.round((base * dpPct) / 100);
    const list = [make(t('fin.dpLabel', { pct: dpPct }), dpAmount, plan.dpDue), ...(dpPct < 100 ? [make(t('fin.finalLabel'), base - dpAmount, finalDue)] : [])];
    updateEventFinance(event.id, (x) => ({ ...x, invoices: [...x.invoices, ...list] }));
    toast.success(t('fin.scheduleCreated', { count: list.length }));
  }

  function setStatus(inv: Invoice, status: Invoice['status']) {
    updateEventFinance(event.id, (x) => ({ ...x, invoices: x.invoices.map((i) => (i.id === inv.id ? { ...i, status } : i)) }));
  }

  function savePayment(e: FormEvent) {
    e.preventDefault();
    if (!paying) return;
    const amount = Number(pay.amount) || 0;
    if (amount <= 0) return;
    updateEventFinance(event.id, (x) => ({ ...x, invoices: x.invoices.map((i) => (i.id === paying.id ? { ...i, status: i.status === 'draft' ? 'sent' : i.status, payments: [...i.payments, { id: nextId(), amount, date: pay.date, method: pay.method, note: pay.note.trim() }] } : i)) }));
    toast.success(t('fin.paymentSaved', { amount: rupiah(amount) }));
    setPaying(null);
  }

  function addCost(e: FormEvent) {
    e.preventDefault();
    const amount = Number(cost.amount) || 0;
    if (amount <= 0) return;
    updateEventFinance(event.id, (x) => ({ ...x, costs: [...x.costs, { id: nextId(), category: cost.category, amount, note: cost.note.trim(), date: now }] }));
    setCost({ ...cost, amount: '', note: '' });
  }

  function addExtra(e: FormEvent) {
    e.preventDefault();
    const amount = Number(extra.amount) || 0;
    if (amount <= 0 || !extra.description.trim()) return;
    updateEventFinance(event.id, (x) => ({ ...x, extras: [...x.extras, { id: nextId(), type: extra.type, description: extra.description.trim(), amount, invoiceId: null }] }));
    setExtra({ ...extra, description: '', amount: '' });
  }

  function invoiceExtras() {
    const open = f.extras.filter((x) => !x.invoiceId);
    if (!open.length) return;
    const amount = open.reduce((s, x) => s + x.amount, 0);
    const inv: Invoice = { id: nextId(), no: nextInvoiceNo(), label: t('fin.extraLabel'), amount, tax: Math.round((amount * f.taxRate) / 100), due: addDays(now, 7), status: 'draft', payments: [], createdAt: new Date().toISOString(), kind: 'extra' };
    updateEventFinance(event.id, (x) => ({ ...x, invoices: [...x.invoices, inv], extras: x.extras.map((e) => (e.invoiceId ? e : { ...e, invoiceId: inv.id })) }));
    toast.success(t('fin.extraInvoiced', { no: inv.no }));
  }

  function printInvoice(inv: Invoice) {
    const w = window.open('', '_blank', 'width=820,height=900');
    if (!w) { toast.error(t('fin.popupBlocked')); return; }
    const rows = `<tr><td>${inv.label} — ${event.name}</td><td style="text-align:right">${rupiah(inv.amount)}</td></tr>${inv.tax ? `<tr><td>PPN ${f.taxRate}%</td><td style="text-align:right">${rupiah(inv.tax)}</td></tr>` : ''}`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${inv.no}</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#1c2230;padding:40px;max-width:720px;margin:auto}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:8px;border-bottom:1px solid #e3e6ef;text-align:left}.tot td{font-weight:700;font-size:16px;border-top:2px solid #1c2230}.muted{color:#5d6676}.badge{display:inline-block;padding:2px 10px;border-radius:99px;background:#fff4e0;color:#a35a00;font-size:12px}</style></head><body>
      <span class="badge">${t('fin.previewBadge')}</span><h1>INVOICE</h1><div class="muted">${inv.no} · ${t('fin.issued')} ${fmt(inv.createdAt)} · ${t('fin.due')} ${fmt(inv.due)}</div>
      <p><b>${t('fin.billTo')}:</b> ${f.clientName || '—'}<br>${t('fin.event')}: ${event.name} (${fmt(event.start)})<br>${event.address || ''}</p>
      <table><thead><tr><th>${t('fin.description')}</th><th style="text-align:right">${t('fin.amount')}</th></tr></thead><tbody>${rows}<tr class="tot"><td>${t('fin.total')}</td><td style="text-align:right">${rupiah(totalOf(inv))}</td></tr></tbody></table>
      <p class="muted">${t('fin.paid')}: ${rupiah(paidOf(inv))} · ${t('fin.outstanding')}: ${rupiah(totalOf(inv) - paidOf(inv))}</p>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  const stateLabel = (inv: Invoice) => invoiceState(inv, now);

  return (
    <div className="fin-panel">
      <p className="fin-preview"><span className="ck-preview-badge">{t('fin.previewBadge')}</span> {t('fin.previewHint')}</p>

      <div className="fin-cards">
        <div className="fin-card"><span>{t('fin.revenue')}</span><b>{rupiah(sum.revenue)}</b>{sum.extras > 0 && <small>{t('fin.inclExtras', { amount: rupiah(sum.extras) })}</small>}</div>
        <div className="fin-card"><span>{t('fin.cost')}</span><b>{rupiah(sum.cost)}</b><small>{t('fin.costSplit', { vendor: rupiah(sum.vendor), manual: rupiah(sum.manual) })}</small></div>
        <div className={`fin-card ${sum.margin < 0 ? 'neg' : 'pos'}`}><span>{t('fin.margin')}</span><b>{rupiah(sum.margin)}</b><small>{sum.marginPct === null ? t('fin.noContract') : `${sum.marginPct}%`}</small></div>
        <div className={`fin-card${sum.overdue > 0 ? ' neg' : ''}`}><span>{t('fin.receivable')}</span><b>{rupiah(sum.outstanding)}</b><small>{sum.overdue > 0 ? t('fin.overdueAmount', { amount: rupiah(sum.overdue) }) : t('fin.paidOf', { paid: rupiah(sum.paid), billed: rupiah(sum.billed) })}</small></div>
      </div>

      <div className="fin-grid">
        <section className="card fin-block">
          <h3>{t('fin.contractTitle')}</h3>
          <form className="fin-row" onSubmit={saveContract}>
            <label className="fin-f"><span>{t('fin.client')}</span><input id="fin-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder={t('fin.clientPh')} /></label>
            <label className="fin-f"><span>{t('fin.contractValue')}</span><MoneyInput id="fin-contract" value={contract} onChange={setContract} /></label>
            <button type="submit" className="btn btn-primary" disabled={(Number(contract) || 0) === f.contract && client.trim() === f.clientName}>{t('fin.save')}</button>
          </form>
          <p className="fin-hint">{t('fin.contractHint')}</p>
        </section>

        <section className="card fin-block">
          <h3>{t('fin.costsTitle')}</h3>
          <ul className="fin-list">
            <li><span>{t('fin.costRent')} <em className="fin-auto">{t('fin.auto')}</em></span><b>{autoQuery.isLoading ? '…' : rupiah(auto?.rent ?? 0)}</b></li>
            <li><span>{t('fin.costOutsource')} <em className="fin-auto">{t('fin.auto')}</em></span><b>{autoQuery.isLoading ? '…' : rupiah(auto?.outsource ?? 0)}</b></li>
            {f.costs.map((c) => (
              <li key={c.id}><span>{t(`fin.cat.${c.category}`)}{c.note && <small> · {c.note}</small>}</span><b>{rupiah(c.amount)}</b>
                <button type="button" className="fin-x" aria-label={t('fin.remove')} onClick={() => updateEventFinance(event.id, (x) => ({ ...x, costs: x.costs.filter((y) => y.id !== c.id) }))}>×</button></li>
            ))}
          </ul>
          {autoQuery.isError && <p className="fin-hint warn">{t('fin.autoError')}</p>}
          <form className="fin-row" onSubmit={addCost}>
            <select id="fin-cost-cat" value={cost.category} onChange={(e) => setCost({ ...cost, category: e.target.value as ManualCost['category'] })}>{COST_CATS.map((c) => <option key={c} value={c}>{t(`fin.cat.${c}`)}</option>)}</select>
            <MoneyInput id="fin-cost-amount" value={cost.amount} onChange={(v) => setCost({ ...cost, amount: v })} />
            <input id="fin-cost-note" value={cost.note} onChange={(e) => setCost({ ...cost, note: e.target.value })} placeholder={t('fin.notePh')} />
            <button type="submit" className="btn btn-ghost" disabled={!(Number(cost.amount) > 0)}>{t('fin.addCost')}</button>
          </form>
        </section>
      </div>

      <section className="card fin-block">
        <div className="fin-block-head"><h3>{t('fin.invoicesTitle')}</h3>{f.invoices.length > 0 && <span className="fin-hint">{t('fin.invoiceCount', { count: f.invoices.length })}</span>}</div>
        {f.invoices.length === 0 ? (
          <div className="fin-plan">
            <p>{f.contract ? t('fin.planIntro') : t('fin.planNeedContract')}</p>
            <div className="fin-row">
              <label className="fin-f small"><span>{t('fin.dpPct')}</span><input id="fin-dp" type="number" min={0} max={100} value={plan.dp} onChange={(e) => setPlan({ ...plan, dp: e.target.value })} /></label>
              <label className="fin-f"><span>{t('fin.dpDue')}</span><input id="fin-dp-due" type="date" value={plan.dpDue} onChange={(e) => setPlan({ ...plan, dpDue: e.target.value })} /></label>
              <label className="fin-f small"><span>{t('fin.finalDays')}</span><input id="fin-final" type="number" min={0} value={plan.finalDays} onChange={(e) => setPlan({ ...plan, finalDays: e.target.value })} /></label>
              <label className="ck-check-inline"><input type="checkbox" checked={plan.tax} onChange={(e) => setPlan({ ...plan, tax: e.target.checked })} />{t('fin.withTax', { rate: f.taxRate })}</label>
            </div>
            {f.contract > 0 && <p className="fin-hint">{t('fin.planPreview', { dp: rupiah(Math.round(f.contract * (Number(plan.dp) || 0) / 100)), dpDue: fmt(plan.dpDue), rest: rupiah(f.contract - Math.round(f.contract * (Number(plan.dp) || 0) / 100)), finalDue: fmt(finalDue) })}</p>}
            <button type="button" className="btn btn-primary" disabled={!f.contract} onClick={createSchedule}>{t('fin.createSchedule')}</button>
          </div>
        ) : (
          <div className="fin-table"><table>
            <thead><tr><th>{t('fin.no')}</th><th>{t('fin.description')}</th><th className="num">{t('fin.total')}</th><th>{t('fin.due')}</th><th>{t('fin.status')}</th><th /></tr></thead>
            <tbody>{f.invoices.map((inv) => {
              const st = stateLabel(inv);
              return (
                <tr key={inv.id}>
                  <td className="mono">{inv.no}</td>
                  <td>{inv.label}{inv.tax > 0 && <small className="fin-muted"> · {t('fin.inclTax')}</small>}</td>
                  <td className="num">{rupiah(totalOf(inv))}{paidOf(inv) > 0 && st !== 'paid' && <small className="fin-muted"><br />{t('fin.paid')} {rupiah(paidOf(inv))}</small>}</td>
                  <td>{fmt(inv.due)}</td>
                  <td><span className={`fin-status ${st}`}>{t(`fin.st.${st}`)}</span></td>
                  <td className="fin-actions">
                    {inv.status === 'draft' && <button type="button" className="ts-link" onClick={() => setStatus(inv, 'sent')}>{t('fin.markSent')}</button>}
                    {st !== 'paid' && <button type="button" className="ts-link" onClick={() => { setPaying(inv); setPay({ amount: String(totalOf(inv) - paidOf(inv)), date: now, method: 'transfer', note: '' }); }}>{t('fin.recordPayment')}</button>}
                    <button type="button" className="ts-link muted" onClick={() => setViewing(inv)}>{t('fin.view')}</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </section>

      <section className="card fin-block">
        <h3>{t('fin.extrasTitle')}</h3>
        <p className="fin-hint">{t('fin.extrasHint')}</p>
        {f.extras.length > 0 && (
          <ul className="fin-list">
            {f.extras.map((x) => <li key={x.id}><span>{t(`fin.extra.${x.type}`)} · {x.description}{x.invoiceId && <small className="fin-muted"> · {t('fin.invoiced')}</small>}</span><b>{rupiah(x.amount)}</b></li>)}
          </ul>
        )}
        <form className="fin-row" onSubmit={addExtra}>
          <select id="fin-extra-type" value={extra.type} onChange={(e) => setExtra({ ...extra, type: e.target.value as ExtraCharge['type'] })}>{EXTRA_TYPES.map((x) => <option key={x} value={x}>{t(`fin.extra.${x}`)}</option>)}</select>
          <input id="fin-extra-desc" value={extra.description} onChange={(e) => setExtra({ ...extra, description: e.target.value })} placeholder={t('fin.extraPh')} />
          <MoneyInput id="fin-extra-amount" value={extra.amount} onChange={(v) => setExtra({ ...extra, amount: v })} />
          <button type="submit" className="btn btn-ghost" disabled={!(Number(extra.amount) > 0) || !extra.description.trim()}>{t('fin.addExtra')}</button>
        </form>
        {f.extras.some((x) => !x.invoiceId) && <button type="button" className="btn btn-primary" onClick={invoiceExtras}>{t('fin.invoiceExtras')}</button>}
      </section>

      {paying && (
        <Modal open onClose={() => setPaying(null)} title={t('fin.paymentTitle', { no: paying.no })} footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setPaying(null)}>{t('eventChecklist.cancel')}</button>
          <button type="submit" form="fin-pay-form" className="btn btn-primary" disabled={!(Number(pay.amount) > 0)}>{t('fin.savePayment')}</button>
        </>}>
          <form id="fin-pay-form" className="fin-pay" onSubmit={savePayment}>
            <p className="fin-hint">{t('fin.remaining', { amount: rupiah(totalOf(paying) - paidOf(paying)) })}</p>
            <label className="fin-f"><span>{t('fin.amount')}</span><MoneyInput id="fin-pay-amount" value={pay.amount} onChange={(v) => setPay({ ...pay, amount: v })} /></label>
            <label className="fin-f"><span>{t('fin.payDate')}</span><input id="fin-pay-date" type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></label>
            <label className="fin-f"><span>{t('fin.method')}</span><select id="fin-pay-method" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{['transfer', 'cash', 'giro', 'other'].map((m) => <option key={m} value={m}>{t(`fin.methods.${m}`)}</option>)}</select></label>
            <label className="fin-f"><span>{t('fin.payNote')}</span><input id="fin-pay-note" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder={t('fin.payNotePh')} /></label>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.no} footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setViewing(null)}>{t('fin.close')}</button>
          <button type="button" className="btn btn-primary" onClick={() => printInvoice(viewing)}>{t('fin.printPdf')}</button>
        </>}>
          <div className="fin-view">
            <p><b>{viewing.label}</b> · {event.name}</p>
            <ul className="fin-list">
              <li><span>{t('fin.amount')}</span><b>{rupiah(viewing.amount)}</b></li>
              {viewing.tax > 0 && <li><span>PPN {f.taxRate}%</span><b>{rupiah(viewing.tax)}</b></li>}
              <li className="total"><span>{t('fin.total')}</span><b>{rupiah(totalOf(viewing))}</b></li>
            </ul>
            <p className="fin-hint">{t('fin.due')}: {fmt(viewing.due)} · {t('fin.billTo')}: {f.clientName || '—'}</p>
            {viewing.payments.length > 0 && <ul className="fin-list">{viewing.payments.map((p) => <li key={p.id}><span>{fmt(p.date)} · {t(`fin.methods.${p.method}`)}{p.note && ` · ${p.note}`}</span><b>{rupiah(p.amount)}</b></li>)}</ul>}
            <p className="fin-muted">{t('fin.recordedBy', { name: currentUserName('—') })}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
