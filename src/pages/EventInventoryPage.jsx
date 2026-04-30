import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch } from '../components/icons';
import { eiData } from '../data/eventInventory';

const PAGE_SIZE = 10;

export default function EventInventoryPage() {
  const [query,        setQuery]        = useState('');
  const [eventFilter,  setEventFilter]  = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(1);
  const [sortCol,      setSortCol]      = useState(0);
  const [sortAsc,      setSortAsc]      = useState(true);

  const sortKeys = ['event', 'location', 'status', 'item'];

  const eventNames = useMemo(() => [...new Set(eiData.map(r => r.event))].sort(), []);
  const statuses   = useMemo(() => [...new Set(eiData.map(r => r.status))].sort(), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const key = sortKeys[sortCol] || 'event';
    return eiData
      .filter(r => {
        const mQ = !q || r.event.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.item.toLowerCase().includes(q);
        const mE = !eventFilter  || r.event  === eventFilter;
        const mS = !statusFilter || r.status === statusFilter;
        return mQ && mE && mS;
      })
      .sort((a, b) => {
        const va = String(a[key] ?? ''), vb = String(b[key] ?? '');
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
  }, [query, eventFilter, statusFilter, sortCol, sortAsc]);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Event Inventory</h1>
      </div>

      {/* Stats */}
      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'Total Records', value:eiData.length,    color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Events',        value:eventNames.length, color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Showing',       value:filtered.length,   color:'var(--purple)', bg:'var(--purple-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}>
              <span className="stat-value" style={{ color:s.color }}>{s.value}</span>
            </div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input" type="text" placeholder="Search event, item…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={eventFilter} onChange={e => { setEventFilter(e.target.value); setPage(1); }}>
                <option value="">All Events</option>
                {eventNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="wi-select-wrap">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn-search">Search</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Event"        colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:120 }} />
                <SortTh label="Location"     colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:140 }} />
                <th style={{ width:180 }}>Status</th>
                <SortTh label="Item"         colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <th style={{ width:110, textAlign:'right' }}>Stock Item</th>
                <th style={{ width:120, textAlign:'right' }}>Stock in Cart</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No results found.</td></tr>
                : pageData.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{r.event}</td>
                    <td>{r.location}</td>
                    <td>
                      <span className="badge badge-blue" style={{ fontSize:'10.5px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', display:'inline-block' }}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.item}</td>
                    <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.stockItem}</td>
                    <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', color: r.stockCart > r.stockItem ? 'var(--red)' : 'inherit' }}>
                      {r.stockCart}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} label="records" />
      </div>
    </>
  );
}
