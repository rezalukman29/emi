import { useSyncExternalStore } from 'react';
import ax from '../service/axios';

// Project Finance — PREVIEW (owner 2026-11-26: "start", backend not ready). Contract value, invoices, payments,
// manual costs and extra charges are stored in THIS browser (localStorage `emi.finance.v1`) until the API in
// docs/api-backlog.md §14 exists. Vendor costs are REAL: rentals (GET /v1/loan-items, rental_cost per event) and
// outsource (GET /v1/outsource-items, total_cost per event).

export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export interface Payment { id: number; amount: number; date: string; method: string; note: string }
export interface Invoice { id: number; no: string; label: string; amount: number; tax: number; due: string; status: InvoiceStatus; payments: Payment[]; createdAt: string; kind: 'term' | 'extra' }
export interface ManualCost { id: number; category: 'transport' | 'crew' | 'production' | 'consumption' | 'other'; amount: number; note: string; date: string }
export interface ExtraCharge { id: number; type: 'broken' | 'lost' | 'late' | 'other'; description: string; amount: number; invoiceId: number | null }
export interface EventFinance { contract: number; taxRate: number; invoices: Invoice[]; costs: ManualCost[]; extras: ExtraCharge[]; clientName: string; updatedAt: string }

interface State { version: 1; events: Record<number, EventFinance>; nextId: number; counter: Record<string, number> }
const KEY = 'emi.finance.v1';
const EMPTY: State = { version: 1, events: {}, nextId: 1, counter: {} };
export const EMPTY_FINANCE: EventFinance = { contract: 0, taxRate: 11, invoices: [], costs: [], extras: [], clientName: '', updatedAt: '' };

function load(): State {
  try { const raw = localStorage.getItem(KEY); const p = raw ? JSON.parse(raw) as State : null; return p?.version === 1 ? { ...EMPTY, ...p } : EMPTY; } catch { return EMPTY; }
}
let state = load();
const listeners = new Set<() => void>();
const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } listeners.forEach((l) => l()); };
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); listeners.forEach((l) => l()); } });

export function useFinance() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state);
}
export function nextId() { const id = state.nextId; state = { ...state, nextId: id + 1 }; return id; }
export function updateEventFinance(eventId: number, change: (f: EventFinance) => EventFinance) {
  const current = state.events[eventId] ?? EMPTY_FINANCE;
  state = { ...state, events: { ...state.events, [eventId]: { ...change(current), updatedAt: new Date().toISOString() } } };
  emit();
}
/** INV-YYMM-### per tenant (browser for now). */
export function nextInvoiceNo() {
  const now = new Date();
  const key = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const n = (state.counter[key] ?? 0) + 1;
  state = { ...state, counter: { ...state.counter, [key]: n } };
  return `INV-${key}-${String(n).padStart(3, '0')}`;
}

export const paidOf = (inv: Invoice) => inv.payments.reduce((s, p) => s + p.amount, 0);
export const totalOf = (inv: Invoice) => inv.amount + inv.tax;
export function invoiceState(inv: Invoice, today: string): 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' {
  const paid = paidOf(inv);
  if (paid >= totalOf(inv) && totalOf(inv) > 0) return 'paid';
  if (inv.status === 'draft') return 'draft';
  if (inv.due && inv.due < today) return 'overdue';
  return paid > 0 ? 'partial' : 'sent';
}

export interface AutoCosts { rent: number; outsource: number; rentCount: number; outsourceCount: number }
/** Real vendor costs per event, from the existing rental and outsource lists. */
export async function fetchAutoCosts(): Promise<Record<number, AutoCosts>> {
  const [loans, outs] = await Promise.all([
    ax.get('/v1/loan-items', { params: { page: 1, limit: 1000 } }).then((r) => r.data?.data?.data ?? r.data?.data ?? []).catch(() => []),
    ax.get('/v1/outsource-items', { params: { page: 1, limit: 1000 } }).then((r) => r.data?.data?.data ?? r.data?.data ?? []).catch(() => []),
  ]);
  const map: Record<number, AutoCosts> = {};
  const get = (id: number) => (map[id] ??= { rent: 0, outsource: 0, rentCount: 0, outsourceCount: 0 });
  for (const l of loans as Array<Record<string, any>>) {
    const id = Number(l.event_id); if (!id) continue;
    const row = get(id); row.rent += Number(l.rental_cost ?? (Number(l.qty) || 0) * (Number(l.rental_cost_per_unit) || 0)) || 0; row.rentCount += 1;
  }
  for (const o of outs as Array<Record<string, any>>) {
    const id = Number(o.event_id); if (!id) continue;
    const row = get(id); row.outsource += Number(o.total_cost ?? o.cost) || 0; row.outsourceCount += 1;
  }
  return map;
}

export function summarize(f: EventFinance, auto: AutoCosts | undefined, today: string) {
  const vendor = (auto?.rent ?? 0) + (auto?.outsource ?? 0);
  const manual = f.costs.reduce((s, c) => s + c.amount, 0);
  const cost = vendor + manual;
  const extras = f.extras.reduce((s, e) => s + e.amount, 0);
  const revenue = f.contract + extras;
  const margin = revenue - cost;
  const billed = f.invoices.reduce((s, i) => s + totalOf(i), 0);
  const paid = f.invoices.reduce((s, i) => s + paidOf(i), 0);
  const states = f.invoices.map((i) => invoiceState(i, today));
  const overdue = f.invoices.filter((i) => invoiceState(i, today) === 'overdue').reduce((s, i) => s + totalOf(i) - paidOf(i), 0);
  const dueSoon = f.invoices.filter((i) => ['sent', 'partial'].includes(invoiceState(i, today)) && i.due && i.due <= addDays(today, 7)).reduce((s, i) => s + totalOf(i) - paidOf(i), 0);
  return { vendor, manual, cost, extras, revenue, margin, marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : null, billed, paid, outstanding: billed - paid, overdue, dueSoon, states };
}

export function addDays(iso: string, n: number) { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;
