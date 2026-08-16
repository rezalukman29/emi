import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialEvents, TODAY } from '../data/events';
import { inventoryData } from '../data/inventory';
import { initialWarehouses } from '../data/warehouses';
import { initialItemLoans } from '../data/itemLoans';
import { initialActivityLogs } from '../data/activityLogs';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_LONG = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function fmtDate(d: string | null | undefined) {
  if (!d || d === '-') return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function fmtToday(d: Date) {
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - TODAY.getTime()) / 86400000);
}

function stockBadgeClass(status: string) {
  if (status === 'Low Stock') return 'badge-orange';
  if (status === 'Out of Stock') return 'badge-red';
  return 'badge-green';
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : (n / total) * 100;
}

function ArrowUp() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10V2M2 5l4-4 4 4"/></svg>;
}
function ArrowDown() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v8M2 7l4 4 4-4"/></svg>;
}

function KpiDelta({ direction, good = false, children }: { direction: 'up' | 'down' | 'flat'; good?: boolean; children: ReactNode }) {
  const cls = direction === 'flat' ? 'neutral' : (good ? 'up-good' : 'up-bad');
  return (
    <div className={`kpi-delta ${cls}`}>
      {direction === 'up' && <ArrowUp />}
      {direction === 'down' && <ArrowDown />}
      {children}
    </div>
  );
}

const MODULE_DOT: Record<string, string> = {
  Event: 'var(--brand)', Inventory: 'var(--green)', 'Item Loan': 'var(--purple)',
  'Warehouse Inventory': 'var(--orange)', Warehouse: 'var(--red)', System: 'var(--text-muted)',
  Category: 'var(--blue, var(--brand))', Unit: 'var(--blue, var(--brand))', Area: 'var(--blue, var(--brand))',
};

const QUICK_ACTIONS = [
  { to: '/event', label: 'Buat Event Baru', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg> },
  { to: '/inventory', label: 'Tambah Inventory', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { to: '/item-loan', label: 'Pinjam Barang', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/warehouse-inventory', label: 'Stock Opname', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg> },
];

export default function MainDashboardPage() {
  const navigate = useNavigate();

  const upcomingEvents = useMemo(
    () => initialEvents.filter(e => e.type === 'upcoming').sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    []
  );
  const pastCount = initialEvents.filter(e => e.type === 'past').length;
  const maxDaysAway = Math.max(...upcomingEvents.map(ev => daysUntil(ev.start)), 1);
  const nextEvent = upcomingEvents[0];

  const lowStock = inventoryData.filter(i => i.stockStatus === 'Low Stock');
  const outOfStock = inventoryData.filter(i => i.stockStatus === 'Out of Stock');
  const availableCount = inventoryData.length - lowStock.length - outOfStock.length;
  const needsAttention = [...outOfStock, ...lowStock];
  const totalStockUnits = inventoryData.reduce((s, i) => s + i.totalStock, 0);
  const warehouseCount = useMemo(() => new Set(initialWarehouses.map(w => w.name)).size, []);

  const activeLoans = initialItemLoans.filter(l => !l.returnDate);
  const overdueLoans = activeLoans.filter(l => new Date(l.dueDate) < TODAY);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    inventoryData.forEach(i => { map[i.category] = (map[i.category] || 0) + i.totalStock; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);
  const maxCategoryStock = Math.max(...categoryBreakdown.map(([, v]) => v), 1);

  const warehouseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    inventoryData.forEach(i => { map[i.warehouse] = (map[i.warehouse] || 0) + i.totalStock; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, []);
  const maxWarehouseStock = Math.max(...warehouseBreakdown.map(([, v]) => v), 1);

  const recentActivity = useMemo(
    () => [...initialActivityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5),
    []
  );

  return (
    <>
      <div className="dash-hero">
        <div>
          <div className="dash-hero-title">Selamat datang kembali</div>
          <div className="dash-hero-sub">
            Anda punya <strong>{upcomingEvents.length} event mendatang</strong>
            {nextEvent && <> — terdekat <strong>{nextEvent.name}</strong> dalam {daysUntil(nextEvent.start)} hari</>}
            {needsAttention.length > 0 && <> dan <strong>{needsAttention.length} barang</strong> perlu direstock.</>}
          </div>
        </div>
        <div className="dash-hero-date">{fmtToday(TODAY)}</div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{initialEvents.length}</div>
          <div className="kpi-sub">{upcomingEvents.length} upcoming · {pastCount} past</div>
          <KpiDelta direction="up" good>+3 bulan ini</KpiDelta>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Inventory SKU</div>
          <div className="kpi-value">{inventoryData.length}</div>
          <div className="kpi-sub">{totalStockUnits.toLocaleString('id-ID')} total unit</div>
          <KpiDelta direction="up" good>+2 SKU baru</KpiDelta>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Low Stock</div>
          <div className="kpi-value">{lowStock.length}</div>
          <div className="kpi-sub">perlu direstock</div>
          <KpiDelta direction="up" good={false}>+2 minggu ini</KpiDelta>
        </div>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Sedang Dipinjam</div>
          <div className="kpi-value">{activeLoans.length}</div>
          <div className="kpi-sub">dari {initialItemLoans.length} total peminjaman</div>
          <KpiDelta direction="flat">stabil</KpiDelta>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Peminjaman Terlambat</div>
          <div className="kpi-value">{overdueLoans.length}</div>
          <div className="kpi-sub">perlu ditindaklanjuti</div>
          <KpiDelta direction="up" good={false}>butuh perhatian</KpiDelta>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Warehouses</div>
          <div className="kpi-value">{warehouseCount}</div>
          <div className="kpi-sub">lokasi gudang aktif</div>
          <KpiDelta direction="flat">tidak berubah</KpiDelta>
        </div>
      </div>

      <div className="dash-quick-actions">
        {QUICK_ACTIONS.map(a => (
          <button key={a.to} className="dash-quick-btn" onClick={() => navigate(a.to)}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">Upcoming Events</div>
          <div className="viz-event-list">
            {upcomingEvents.map(ev => {
              const days = daysUntil(ev.start);
              return (
                <div key={ev.id} className="viz-event-row" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(ev.name)}`)}>
                  <div className="viz-event-info">
                    <div className="dash-mini-name">{ev.name}</div>
                    <div className="dash-mini-sub">{fmtDate(ev.date)} · {ev.location}</div>
                  </div>
                  <div className="viz-bar-track" title={`${days} hari lagi`}>
                    <div className="viz-bar-fill" style={{ width: `${pct(days, maxDaysAway)}%` }} />
                  </div>
                  <span className="badge badge-blue viz-event-days">{days}d</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Kesehatan Stok</div>
          <div className="viz-stacked-bar">
            <div className="viz-stacked-segment" style={{ width: `${pct(availableCount, inventoryData.length)}%`, background: 'var(--green)' }} title={`Available: ${availableCount} SKU`} />
            <div className="viz-stacked-segment" style={{ width: `${pct(lowStock.length, inventoryData.length)}%`, background: 'var(--orange)' }} title={`Low Stock: ${lowStock.length} SKU`} />
            <div className="viz-stacked-segment" style={{ width: `${pct(outOfStock.length, inventoryData.length)}%`, background: 'var(--red)' }} title={`Out of Stock: ${outOfStock.length} SKU`} />
          </div>
          <div className="viz-legend">
            <span className="viz-legend-item"><i style={{ background: 'var(--green)' }} /> Available <strong>{availableCount}</strong></span>
            <span className="viz-legend-item"><i style={{ background: 'var(--orange)' }} /> Low Stock <strong>{lowStock.length}</strong></span>
            <span className="viz-legend-item"><i style={{ background: 'var(--red)' }} /> Out of Stock <strong>{outOfStock.length}</strong></span>
          </div>
          <p className="summary-text" style={{ marginTop: 14, marginBottom: 0 }}>
            <strong>{pct(availableCount, inventoryData.length).toFixed(0)}%</strong> dari {inventoryData.length} SKU dalam kondisi stok aman.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">Distribusi Stok per Gudang</div>
          <div className="viz-bar-chart">
            {warehouseBreakdown.map(([warehouse, stock]) => (
              <div key={warehouse} className="viz-bar-row">
                <div className="viz-bar-label">{warehouse}</div>
                <div className="viz-bar-track" title={`${warehouse}: ${stock.toLocaleString('id-ID')} unit`}>
                  <div className="viz-bar-fill" style={{ width: `${pct(stock, maxWarehouseStock)}%` }} />
                </div>
                <div className="viz-bar-value">{stock.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Aktivitas Terbaru</div>
          <div className="dash-activity-list">
            {recentActivity.map(log => (
              <div key={log.id} className="dash-activity-row">
                <span className="dash-activity-dot" style={{ background: MODULE_DOT[log.module] || 'var(--text-muted)' }} />
                <div className="dash-activity-body">
                  <div className="dash-activity-text"><strong>{log.userName}</strong> · {log.description}</div>
                  <div className="dash-activity-time">{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-title">Stok per Kategori</div>
        <div className="viz-bar-chart">
          {categoryBreakdown.map(([category, stock]) => (
            <div key={category} className="viz-bar-row">
              <div className="viz-bar-label">{category}</div>
              <div className="viz-bar-track" title={`${category}: ${stock.toLocaleString('id-ID')} unit`}>
                <div className="viz-bar-fill" style={{ width: `${pct(stock, maxCategoryStock)}%` }} />
              </div>
              <div className="viz-bar-value">{stock.toLocaleString('id-ID')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Perlu Perhatian — Stok Menipis &amp; Habis</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Barang</th>
                <th>Kategori</th>
                <th>Gudang</th>
                <th style={{ width: 90, textAlign: 'right' }}>Stok</th>
                <th style={{ width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {needsAttention.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Semua stok aman.</td></tr>
                : needsAttention.map(i => (
                  <tr key={i.id}>
                    <td className="name-cell">{i.name}</td>
                    <td>{i.category}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{i.warehouse}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.totalStock} {i.unit}</td>
                    <td><span className={`badge ${stockBadgeClass(i.stockStatus)}`}>{i.stockStatus}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
