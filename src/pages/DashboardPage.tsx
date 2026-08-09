import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialEvents, TODAY } from '../data/events';
import { inventoryData } from '../data/inventory';
import { initialWarehouses } from '../data/warehouses';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d: string | null | undefined) {
  if (!d || d === '-') return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - TODAY.getTime()) / 86400000);
}

function stockBadgeClass(status: string) {
  if (status === 'Low Stock') return 'badge-orange';
  if (status === 'Out of Stock') return 'badge-red';
  return 'badge-green';
}

export default function MainDashboardPage() {
  const navigate = useNavigate();

  const upcomingEvents = useMemo(
    () => initialEvents.filter(e => e.type === 'upcoming').sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    ),
    []
  );
  const pastCount = initialEvents.filter(e => e.type === 'past').length;

  const lowStock = inventoryData.filter(i => i.stockStatus === 'Low Stock');
  const outOfStock = inventoryData.filter(i => i.stockStatus === 'Out of Stock');
  const needsAttention = [...outOfStock, ...lowStock];
  const totalStockUnits = inventoryData.reduce((s, i) => s + i.totalStock, 0);
  const warehouseCount = useMemo(() => new Set(initialWarehouses.map(w => w.name)).size, []);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    inventoryData.forEach(i => { map[i.category] = (map[i.category] || 0) + i.totalStock; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);
  const maxCategoryStock = Math.max(...categoryBreakdown.map(([, v]) => v), 1);

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{initialEvents.length}</div>
          <div className="kpi-sub">{upcomingEvents.length} upcoming · {pastCount} past</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Inventory SKU</div>
          <div className="kpi-value">{inventoryData.length}</div>
          <div className="kpi-sub">{totalStockUnits.toLocaleString('id-ID')} total units</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Low Stock</div>
          <div className="kpi-value">{lowStock.length}</div>
          <div className="kpi-sub">perlu direstock</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Warehouses</div>
          <div className="kpi-value">{warehouseCount}</div>
          <div className="kpi-sub">lokasi gudang aktif</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 22 }}>
        <div className="card">
          <div className="section-title">Upcoming Events</div>
          <div className="dash-mini-list">
            {upcomingEvents.map(ev => (
              <div key={ev.id} className="dash-mini-item" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(ev.name)}`)}>
                <div>
                  <div className="dash-mini-name">{ev.name}</div>
                  <div className="dash-mini-sub">{fmtDate(ev.date)} · {ev.location}</div>
                </div>
                <span className="badge badge-blue">{daysUntil(ev.start)}d away</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Stok per Kategori</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categoryBreakdown.map(([category, stock]) => (
              <div key={category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{category}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{stock.toLocaleString('id-ID')}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${(stock / maxCategoryStock) * 100}%`, background: 'var(--brand)' }} />
                </div>
              </div>
            ))}
          </div>
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
