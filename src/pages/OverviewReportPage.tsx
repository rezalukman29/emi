import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import { IconSearch, IconPrint } from '../components/icons';
import { initialEvents } from '../data/events';
import { inventoryData } from '../data/inventory';
import { initialWarehouses } from '../data/warehouses';
import { initialAreas } from '../data/areas';

const PAGE_SIZE = 10;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d: string | null | undefined) {
  if (!d || d === '-') return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function pct(n: number, total: number) { return total === 0 ? 0 : Math.round((n / total) * 100); }

export default function OverviewReportPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const upcomingCount = initialEvents.filter(e => e.type === 'upcoming').length;
  const pastCount = initialEvents.filter(e => e.type === 'past').length;
  const totalItemCount = initialEvents.reduce((s, e) => s + (e.itemCount || 0), 0);
  const warehouseCount = useMemo(() => new Set(initialWarehouses.map(w => w.name)).size, []);

  const locationBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    initialEvents.forEach(e => {
      const loc = e.location && e.location !== '-' ? e.location : 'Lainnya';
      map[loc] = (map[loc] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);
  const maxLocationCount = Math.max(...locationBreakdown.map(([, v]) => v), 1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialEvents.filter(e =>
      (!q || e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)) &&
      (!typeFilter || e.type === typeFilter)
    );
  }, [query, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Overview Report</h1>
        <button className="btn-print" onClick={() => window.print()}><IconPrint /> Print Report</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{initialEvents.length}</div>
          <div className="kpi-sub">all recorded events</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Upcoming</div>
          <div className="kpi-value">{upcomingCount}</div>
          <div className="kpi-sub">{pct(upcomingCount, initialEvents.length)}% of total</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Past Events</div>
          <div className="kpi-value">{pastCount}</div>
          <div className="kpi-sub">{pct(pastCount, initialEvents.length)}% of total</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Warehouses</div>
          <div className="kpi-value">{warehouseCount}</div>
          <div className="kpi-sub">active warehouse locations</div>
        </div>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Areas</div>
          <div className="kpi-value">{initialAreas.length}</div>
          <div className="kpi-sub">registered setup areas</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Inventory SKU</div>
          <div className="kpi-value">{inventoryData.length}</div>
          <div className="kpi-sub">{totalItemCount.toLocaleString('id-ID')} items in upcoming events</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">Event Progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {[
            { label: 'Upcoming', value: upcomingCount, color: 'var(--brand)' },
            { label: 'Past', value: pastCount, color: 'var(--green)' },
          ].map(b => {
            const p = pct(b.value, initialEvents.length);
            return (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{b.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{b.value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({p}%)</span></span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${p}%`, background: b.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">Events by Location</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {locationBreakdown.map(([location, count]) => (
            <div key={location}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{location}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{count} event</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${(count / maxLocationCount) * 100}%`, background: 'var(--purple)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input" type="text" placeholder="Search name, code, or location…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event Name</th>
                <th style={{ width: 90 }}>Code</th>
                <th style={{ width: 130 }}>Date</th>
                <th>Location</th>
                <th style={{ width: 90, textAlign: 'right' }}>Items</th>
                <th style={{ width: 100 }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No events found.</td></tr>
                : pageData.map(e => (
                  <tr key={e.id}>
                    <td className="name-cell">{e.name}</td>
                    <td className="id-cell" style={{ fontFamily: 'monospace' }}>{e.code}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtDate(e.date)}</td>
                    <td>{e.location}</td>
                    <td style={{ textAlign: 'right' }}>{e.itemCount ?? '—'}</td>
                    <td><span className={`badge ${e.type === 'upcoming' ? 'badge-blue' : 'badge-gray'}`}>{e.type}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="event" />
      </div>
    </>
  );
}
