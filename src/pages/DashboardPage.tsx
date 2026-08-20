import { useNavigate } from 'react-router-dom';
import { TODAY } from '../data/events';
import { inventoryData } from '../data/inventory';
import useGetDashboard from '../hooks/api/useGetDashboard';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtDate(d: string | null | undefined) {
  if (!d || d === '-') return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function fmtToday(d: Date) {
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(date: string) {
  const parsedDate = new Date(date.replace(' ', 'T'));
  if (Number.isNaN(parsedDate.getTime())) return 0;
  return Math.max(0, Math.ceil((parsedDate.getTime() - TODAY.getTime()) / 86400000));
}

function stockBadgeClass(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  if (normalized === 'low stock') return 'badge-orange';
  if (normalized === 'out of stock') return 'badge-red';
  return 'badge-green';
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : (n / total) * 100;
}

const MODULE_DOT: Record<string, string> = {
  Event: 'var(--brand)', Inventory: 'var(--green)', 'Item Loan': 'var(--purple)',
  'Warehouse Inventory': 'var(--orange)', Warehouse: 'var(--red)', System: 'var(--text-muted)',
  Category: 'var(--blue, var(--brand))', Unit: 'var(--blue, var(--brand))', Area: 'var(--blue, var(--brand))',
};

const QUICK_ACTIONS = [
  { to: '/event', label: 'Create New Event', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg> },
  { to: '/inventory', label: 'Add Inventory', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { to: '/item-loan', label: 'Loan Item', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/warehouse-inventory', label: 'Stock Opname', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg> },
];

export default function MainDashboardPage() {
  const navigate = useNavigate();
  const { data: response, isLoading, isError } = useGetDashboard();
  const dashboard = response?.data;
  const summary = dashboard?.summary;
  const upcomingEvents = dashboard?.upcoming_events ?? [];
  const needsAttention = dashboard?.needs_attention ?? [];
  const warehouseBreakdown = dashboard?.stock_by_warehouse ?? [];
  const recentActivity = dashboard?.recent_activity ?? [];
  const categoryBreakdown = dashboard?.stock_by_category ?? [];
  const maxDaysAway = Math.max(...upcomingEvents.map(ev => daysUntil(ev.event_start)), 1);
  const nextEvent = upcomingEvents[0];

  // Stock Health intentionally still uses dummy data until BE provides it.
  const lowStock = inventoryData.filter(i => i.stockStatus === 'Low Stock');
  const outOfStock = inventoryData.filter(i => i.stockStatus === 'Out of Stock');
  const availableCount = inventoryData.length - lowStock.length - outOfStock.length;
  const maxCategoryStock = Math.max(...categoryBreakdown.map(item => item.total_stock), 1);
  const maxWarehouseStock = Math.max(...warehouseBreakdown.map(item => item.total_stock), 1);

  return (
    <>
      <div className="dash-hero">
        <div>
          <div className="dash-hero-title">Welcome back</div>
          <div className="dash-hero-sub">
            You have <strong>{summary?.upcoming_count ?? 0} upcoming events</strong>
            {nextEvent && <> — the nearest is <strong>{nextEvent.name}</strong> in {daysUntil(nextEvent.event_start)} days</>}
            {needsAttention.length > 0 && <> and <strong>{needsAttention.length} items</strong> need restocking.</>}
          </div>
        </div>
        <div className="dash-hero-date">{fmtToday(TODAY)}</div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.total_events ?? 0)}</div>
          <div className="kpi-sub">{summary?.upcoming_count ?? 0} upcoming · {summary?.past_count ?? 0} past</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Inventory SKU</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.inventory_sku ?? 0)}</div>
          <div className="kpi-sub">{(summary?.total_stock ?? 0).toLocaleString('id-ID')} total units</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Low Stock</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.low_stock ?? 0)}</div>
          <div className="kpi-sub">{summary?.out_of_stock ?? 0} out of stock</div>
        </div>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Currently Loaned</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.loaned ?? 0)}</div>
          <div className="kpi-sub">of {summary?.total_loans ?? 0} total loans</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Overdue Loans</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.overdue ?? 0)}</div>
          <div className="kpi-sub">need follow-up</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Warehouses</div>
          <div className="kpi-value">{isLoading ? '—' : (summary?.warehouse_count ?? 0)}</div>
          <div className="kpi-sub">active warehouse locations</div>
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
            {isLoading ? (
              <div className="no-data">Loading upcoming events…</div>
            ) : isError ? (
              <div className="no-data">Failed to load upcoming events.</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="no-data">No upcoming events.</div>
            ) : upcomingEvents.map(ev => {
              const days = daysUntil(ev.event_start);
              return (
                <div key={ev.id} className="viz-event-row" onClick={() => navigate(`/event-detail?id=${ev.id}`)}>
                  <div className="viz-event-info">
                    <div className="dash-mini-name">{ev.name}</div>
                    <div className="dash-mini-sub">{fmtDate(ev.event_start)} · {ev.location || '—'}</div>
                  </div>
                  <div className="viz-bar-track" title={`${days} days remaining`}>
                    <div className="viz-bar-fill" style={{ width: `${pct(days, maxDaysAway)}%` }} />
                  </div>
                  <span className="badge badge-blue viz-event-days">{days}d</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Stock Health</div>
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
            <strong>{pct(availableCount, inventoryData.length).toFixed(0)}%</strong> of {inventoryData.length} SKUs have healthy stock levels.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">Stock Distribution by Warehouse</div>
          <div className="viz-bar-chart">
            {isLoading ? (
              <div className="no-data">Loading warehouse stock…</div>
            ) : isError ? (
              <div className="no-data">Failed to load warehouse stock.</div>
            ) : warehouseBreakdown.length === 0 ? (
              <div className="no-data">No warehouse stock data.</div>
            ) : warehouseBreakdown.map(item => (
                <div key={item.warehouse} className="viz-bar-row">
                  <div className="viz-bar-label">{item.warehouse || '—'}</div>
                  <div className="viz-bar-track" title={`${item.warehouse}: ${item.total_stock.toLocaleString('id-ID')} units`}>
                    <div className="viz-bar-fill" style={{ width: `${pct(item.total_stock, maxWarehouseStock)}%` }} />
                  </div>
                  <div className="viz-bar-value">{item.total_stock.toLocaleString('id-ID')}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Recent Activity</div>
          <div className="dash-activity-list">
            {isLoading ? (
              <div className="no-data">Loading recent activity…</div>
            ) : isError ? (
              <div className="no-data">Failed to load recent activity.</div>
            ) : recentActivity.length === 0 ? (
              <div className="no-data">No recent activity.</div>
            ) : recentActivity.map(log => (
                <div key={log.id} className="dash-activity-row">
                  <span className="dash-activity-dot" style={{ background: MODULE_DOT[log.module] || 'var(--text-muted)' }} />
                  <div className="dash-activity-body">
                    <div className="dash-activity-text"><strong>{log.user_name || '—'}</strong> · {log.description}</div>
                    <div className="dash-activity-time">{log.timestamp}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-title">Stock by Category</div>
        <div className="viz-bar-chart">
          {isLoading ? (
            <div className="no-data">Loading category stock…</div>
          ) : isError ? (
            <div className="no-data">Failed to load category stock.</div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="no-data">No category stock data.</div>
          ) : categoryBreakdown.map(item => (
              <div key={item.category} className="viz-bar-row">
                <div className="viz-bar-label">{item.category || '—'}</div>
                <div className="viz-bar-track" title={`${item.category}: ${item.total_stock.toLocaleString('id-ID')} units across ${item.sku_count} SKUs`}>
                  <div className="viz-bar-fill" style={{ width: `${pct(item.total_stock, maxCategoryStock)}%` }} />
                </div>
                <div className="viz-bar-value">{item.total_stock.toLocaleString('id-ID')}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Needs Attention — Low &amp; Out of Stock</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Warehouse</th>
                <th style={{ width: 90, textAlign: 'right' }}>Stock</th>
                <th style={{ width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Loading items…</td></tr>
              ) : isError ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Failed to load items requiring attention.</td></tr>
              ) : needsAttention.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>All stock levels are healthy.</td></tr>
              ) : needsAttention.map(i => (
                  <tr key={i.id}>
                    <td className="name-cell">{i.name}</td>
                    <td>{i.category}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{i.warehouse}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.total_stock} {i.unit}</td>
                    <td><span className={`badge ${stockBadgeClass(i.status)}`}>{i.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
