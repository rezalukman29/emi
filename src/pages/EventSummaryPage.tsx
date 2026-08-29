import { useState, useMemo, type CSSProperties } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPrint, IconChevronLeft } from '../components/icons';
import useGetEventDetail from '../hooks/api/useGetEventDetail';
import useGetEventSummary, {
  type EventSummaryItemDetail,
} from '../hooks/api/useGetEventSummary';
import useGetEventStatus from '../hooks/api/useGetEventStatus';

const TABLE_PAGE_SIZE = 12;

interface SummaryItem {
  id: number;
  name: string;
  area: string;
  qty: number;
  status: string;
  checking: boolean;
  warehouseItem: boolean;
  scanIn: boolean | string | null;
  scanOut: boolean | string | null;
  pic: string;
}

interface AreaStat {
  total: number;
  checked: number;
  checkedPercentage?: number;
  scanIn: number;
  scanInPercentage?: number;
  scanOut: number;
  statuses: Record<string, number>;
}

interface KpiItem {
  label: string;
  value: number;
  sub: string;
  accent: string;
  style: CSSProperties;
  valueStyle?: CSSProperties;
}

const STATUS_BADGE: Record<string, string> = { 'In Use':'badge-blue', Ready:'badge-green', Missing:'badge-red', Damaged:'badge-orange' };

function pct(n: number, total: number) { return total === 0 ? 0 : Math.round((n / total) * 100); }

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
}

type NullableApiValue = {
  Valid?: boolean;
  Int64?: number;
};

function toBoolean(value: unknown) {
  if (value && typeof value === 'object' && 'Valid' in value) {
    const nullable = value as NullableApiValue;
    return Boolean(nullable.Valid && nullable.Int64);
  }
  return value === true || value === 1 || value === '1';
}

function hasScanValue(value: unknown) {
  if (value && typeof value === 'object' && 'Valid' in value) {
    return Boolean((value as NullableApiValue).Valid);
  }
  return Boolean(value && value !== '0001-01-01 00:00:00');
}

function mapSummaryItem(item: EventSummaryItemDetail, index: number): SummaryItem {
  return {
    id: item.fix_list_item_id ?? index,
    name: item.item_name || '—',
    area: item.area_name || '—',
    qty: Number(item.qty ?? 0),
    status: item.status || '—',
    checking: toBoolean(item.is_checking),
    warehouseItem: false,
    scanIn: hasScanValue(item.is_scan_in),
    scanOut: hasScanValue(item.is_scan_out),
    pic: item.input_by || '—',
  };
}

function DotOk() {
  return <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:4, background:'var(--brand)' }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width:9, height:9 }}><polyline points="20 6 9 17 4 12"/></svg>
  </span>;
}
function DotNo() {
  return <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:4, background:'var(--border)', color:'var(--text-muted)', fontSize:10, fontWeight:700 }}>—</span>;
}

export default function EventSummaryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = Number(searchParams.get('id'));
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [tablePage, setTablePage] = useState(1);

  const {
    data: eventSummaryResponse,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useGetEventSummary({
    id: eventId,
    options: { enabled: Boolean(eventId) },
  });
  const {
    data: eventDetailResponse,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useGetEventDetail({
    id: eventId,
    options: { enabled: Boolean(eventId) },
  });
  const { data: eventStatusResponse } = useGetEventStatus({
    params: {
      page: 1,
      limit: 999,
      sort: 'ASC',
      sortBy: 'order_data',
    },
  });

  const summary = eventSummaryResponse?.data;
  const totalSummary = summary?.total_summary;
  const eventDetail = eventDetailResponse?.data;
  const items = useMemo(
    () => (summary?.item_details ?? []).map(mapSummaryItem),
    [summary?.item_details]
  );

  const total = totalSummary?.total_items ?? 0;
  const checked = totalSummary?.checked ?? 0;
  const scanIn = totalSummary?.scan_in ?? 0;
  const scanOut = totalSummary?.scan_out ?? 0;
  const missing = totalSummary?.missing ?? 0;
  const damaged = totalSummary?.damaged ?? 0;
  const totalQty = totalSummary?.total_qty ?? 0;

  const areaNames = useMemo(() => [...new Set(items.map(i => i.area))].sort(), [items]);
  const statusNames = useMemo(
    () => [...new Set(items.map(i => i.status).filter(status => status && status !== '—'))].sort(),
    [items]
  );

  const areaMap = useMemo(() => {
    const m: Record<string, AreaStat> = {};

    (summary?.area_summary ?? []).forEach(area => {
      m[area.area_name] = {
        total: Number(area.total_items),
        checked: Number(area.checked),
        checkedPercentage: Number(area.checked_percentage),
        scanIn: Number(area.scan_in),
        scanInPercentage: Number(area.scan_in_percentage),
        scanOut: Number(area.scan_out),
        statuses: area.status_counts ?? {},
      };
    });

    items.forEach(it => {
      if (!m[it.area]) m[it.area] = { total:0, checked:0, scanIn:0, scanOut:0, statuses:{} };
      if ((summary?.area_summary ?? []).length > 0) return;
      const a = m[it.area];
      a.total++;
      if (it.checking) a.checked++;
      if (it.scanIn)   a.scanIn++;
      if (it.scanOut)  a.scanOut++;
      a.statuses[it.status] = (a.statuses[it.status] || 0) + 1;
    });
    return m;
  }, [items, summary?.area_summary]);

  const tableFiltered = useMemo(() => {
    const q = tableSearch.toLowerCase();
    return items.filter(i =>
      (!q           || i.name.toLowerCase().includes(q) || i.area.toLowerCase().includes(q) || (i.pic||'').toLowerCase().includes(q)) &&
      (!statusFilter || i.status === statusFilter) &&
      (!areaFilter   || i.area === areaFilter)
    );
  }, [items, tableSearch, statusFilter, areaFilter]);

  const tableTotalPages = Math.max(1, Math.ceil(tableFiltered.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(tablePage, tableTotalPages);
  const pageData = tableFiltered.slice((safePage - 1) * TABLE_PAGE_SIZE, safePage * TABLE_PAGE_SIZE);

  const eventStatus = eventDetail?.is_complete === 1
    ? 'Completed'
    : (eventStatusResponse?.data?.data ?? []).find(
        status => status.id === Number(eventDetail?.status),
      )?.name ?? (eventDetail?.status ? `Status ${eventDetail.status}` : '—');
  const statusBadge = eventDetail?.is_complete === 1 ? 'badge-green' : 'badge-blue';

  const kpis: KpiItem[] = [
    { label:'Total Items',  value:total,    sub:`Total qty: ${totalQty} units`, accent:'brand',  style:{} },
    { label:'Checked',      value:checked,  sub:`${totalSummary?.checked_percentage ?? pct(checked,total)}% of all items`, accent:'green', style:{} },
    { label:'Scan In',      value:scanIn,   sub:`${totalSummary?.scan_in_percentage ?? pct(scanIn,total)}% scanned in`, accent:'brand', style:{ borderLeftColor:'var(--purple)' } },
    { label:'Scan Out',     value:scanOut,  sub:`${totalSummary?.scan_out_percentage ?? pct(scanOut,total)}% scanned out`, accent:'green', style:{ borderLeftColor:'var(--green)' } },
    { label:'Missing',      value:missing,  sub:`${pct(missing,total)}% of items`, accent:'red',   style:{}, valueStyle:{ color:'var(--red)' } },
    { label:'Damaged',      value:damaged,  sub:`${pct(damaged,total)}% of items`, accent:'orange', style:{}, valueStyle:{ color:'var(--orange)' } },
  ];

  const progressBars = [
    { label:'Checking Completion', value:checked, total, color:'var(--brand)' },
    { label:'Scan In Completion',  value:scanIn,  total, color:'var(--purple)' },
    { label:'Scan Out Completion', value:scanOut, total, color:'var(--green)' },
  ];

  return (
    <>
      <div className="breadcrumb">
        <Link to="/event">Event</Link>
        <span className="breadcrumb-sep">/</span>
        {eventId ? (
          <Link to={`/event-detail?id=${eventId}`}>
            {eventDetail?.name || "Event Detail"}
          </Link>
        ) : (
          <span>{eventDetail?.name || "Event Detail"}</span>
        )}
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Summary</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate('/event')} style={{ display:'flex', alignItems:'center', color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>
            <IconChevronLeft />
          </button>
          <h1 className="page-title" style={{ margin:0 }}>Event Summary</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-print" onClick={() => window.print()}><IconPrint /> Print Report</button>
        </div>
      </div>

      {!eventId ? (
        <div className="card" style={{ marginBottom:22 }}>Invalid or missing event ID.</div>
      ) : isSummaryLoading || isDetailLoading ? (
        <div className="card" style={{ marginBottom:22 }}>Loading event summary...</div>
      ) : isSummaryError || isDetailError ? (
        <div className="card" style={{ marginBottom:22 }}>Failed to load event summary.</div>
      ) : null}

      {/* Event Info */}
      <div className="event-info-block" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'14px 32px', background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 22px', marginBottom:22, boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
        <div>
          <div className="event-info-name">{eventDetail?.name ?? '—'}</div>
        </div>
        <div className="event-info-meta" style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px', alignItems:'center' }}>
          <div className="event-info-chip"><span>{fmtDate(eventDetail?.event_start)} - {fmtDate(eventDetail?.event_end)}</span></div>
          <div className="event-info-chip"><span>{eventDetail?.address || '—'}</span></div>
          <div className="event-info-chip"><span>{eventDetail?.PIC || '—'}</span></div>
          <div className="event-info-chip"><span>Code: <strong>{eventDetail?.event_code || '—'}</strong></span></div>
          <span className={`badge ${statusBadge}`}>{eventStatus}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom:22 }}>
        {kpis.map(k => (
          <div key={k.label} className={`kpi-card ${k.accent}-accent`} style={k.style}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={k.valueStyle}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom:22 }}>
        <div className="section-title">Completion Progress</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
          {progressBars.map(b => {
            const p = pct(b.value, b.total);
            return (
              <div key={b.label}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:'12.5px', fontWeight:600, color:'var(--text-2)' }}>{b.label}</span>
                  <span style={{ fontSize:'12.5px', fontWeight:700, color:'var(--text)' }}>{b.value} / {b.total} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({p}%)</span></span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width:`${p}%`, background:b.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Area Grid */}
      <div className="section-title">Items by Area</div>
      <div className="area-grid">
        {Object.entries(areaMap).sort(([a],[b]) => a.localeCompare(b)).map(([name, a]) => {
          const cp = a.checkedPercentage ?? pct(a.checked, a.total);
          const sp = a.scanInPercentage ?? pct(a.scanIn, a.total);
          const sop = pct(a.scanOut ?? 0, a.total);
          return (
            <div key={name} className="area-stat-card" style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div className="area-stat-header">
                <span className="area-stat-name">{name}</span>
                <span className="area-stat-count">{a.total} item{a.total !== 1 ? 's' : ''}</span>
              </div>
              {[
                { label:'Checked', color:'var(--brand)', val:cp },
                { label:'Scan In', color:'var(--purple)', val:sp },
                { label:'Scan Out', color:'var(--green)', val:sop },
              ].map(row => (
                <div key={row.label} className="area-stat-row">
                  <span className="area-dot" style={{ background:row.color, width:8, height:8, borderRadius:'50%', flexShrink:0 }} />
                  {row.label}
                  <div className="progress-bar-track" style={{ flex:1, height:5, margin:'0 6px' }}>
                    <div className="progress-bar-fill" style={{ width:`${row.val}%`, background:row.color }} />
                  </div>
                  <span className="area-stat-pct">{Number(row.val).toFixed(2)}%</span>
                </div>
              ))}
              <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
                {Object.entries(a.statuses).sort(([,a],[,b]) => b - a).map(([st, cnt]) => (
                  <span key={st} className={`badge ${STATUS_BADGE[st] || 'badge-gray'}`} style={{ fontSize:'10.5px' }}>{st} · {cnt}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Table */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <div className="section-title" style={{ margin:0, flex:1 }}>Item Detail</div>
          <div style={{ display:'flex', gap:7, alignItems:'center', flexWrap:'wrap' }}>
            <div className="search-wrap" style={{ maxWidth:220 }}>
              <IconSearch />
              <input className="search-input" type="text" placeholder="Search items…" value={tableSearch} onChange={e => { setTableSearch(e.target.value); setTablePage(1); }} />
            </div>
            <SearchableSelect
              inline
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(String(value));
                setTablePage(1);
              }}
              options={[
                { value: "", label: "All Status" },
                ...statusNames.map((status) => ({ value: status, label: status })),
              ]}
              placeholder="All Status"
            />
            <SearchableSelect
              inline
              style={{ width: 160 }}
              value={areaFilter}
              onChange={(value) => {
                setAreaFilter(String(value));
                setTablePage(1);
              }}
              options={[
                { value: "", label: "All Areas" },
                ...areaNames.map((area) => ({ value: area, label: area })),
              ]}
              placeholder="All Areas"
            />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Area</th>
                <th style={{ width:80, textAlign:'center' }}>Qty</th>
                <th style={{ width:100, textAlign:'center' }}>Status</th>
                <th style={{ width:90, textAlign:'center' }}>Checking</th>
                <th style={{ width:90, textAlign:'center' }}>Scan In</th>
                <th style={{ width:90, textAlign:'center' }}>Scan Out</th>
                <th>PIC</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No items found.</td></tr>
                : pageData.map(it => (
                  <tr key={it.id}>
                    <td style={{ fontWeight:500 }}>{it.name}</td>
                    <td><span className="badge badge-gray" style={{ fontSize:'10.5px', textTransform:'uppercase' }}>{it.area}</span></td>
                    <td style={{ textAlign:'center' }}>{it.qty}</td>
                    <td style={{ textAlign:'center' }}><span className={`badge ${STATUS_BADGE[it.status] || 'badge-gray'}`}>{it.status}</span></td>
                    <td style={{ textAlign:'center' }}>{it.checking ? <DotOk /> : <DotNo />}</td>
                    <td style={{ textAlign:'center' }}>{it.scanIn   ? <DotOk /> : <DotNo />}</td>
                    <td style={{ textAlign:'center' }}>{it.scanOut  ? <DotOk /> : <DotNo />}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{it.pic || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={tableFiltered.length} pageSize={TABLE_PAGE_SIZE} onPage={(p: number) => setTablePage(p)} label="items" />
      </div>
    </>
  );
}
