import { Fragment, useState, useMemo, type CSSProperties } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPrint, IconChevronLeft } from '../components/icons';
import useGetEventDetail from '../hooks/api/useGetEventDetail';
import useGetEventSummary, {
  type EventSummaryItemDetail,
} from '../hooks/api/useGetEventSummary';
import useGetEventStatus from '../hooks/api/useGetEventStatus';
import { useTranslation } from "react-i18next";
import { translateApiValue } from "../utils/function";

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
  ownerships: string;
  notes: string;
  subArea: string;
  unit: string;
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

function formatOwnerships(value?: EventSummaryItemDetail['ownerships']): string {
  const ownerships: string[] = [];
  if (value?.ihp) ownerships.push('IHP');
  if (value?.ihc) ownerships.push('IHC');
  if (value?.outsource) ownerships.push('Outsource');
  return ownerships.join(', ') || '—';
}

function formatPrintOwnerships(value: string): string {
  return value
    .split(',')
    .map(ownership => ownership.trim() === 'Outsource' ? 'O' : ownership.trim())
    .join(', ');
}

function mapSummaryItem(
  item: EventSummaryItemDetail,
  index: number,
): SummaryItem {
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
    pic: item.pic?.trim() || '—',
    ownerships: formatOwnerships(item.ownerships),
    notes: item.notes?.trim() || '—',
    subArea: item.sub_area?.trim() || '—',
    unit: item.satuan?.trim() || '',
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
  const { t } = useTranslation();
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
    [summary?.item_details],
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
  const printableAreaGroups = useMemo(() => {
    const groups = new Map<string, SummaryItem[]>();

    tableFiltered.forEach(item => {
      const currentItems = groups.get(item.area) ?? [];
      currentItems.push(item);
      groups.set(item.area, currentItems);
    });

    return [...groups.entries()];
  }, [tableFiltered]);

  const eventStatus = eventDetail?.is_complete === 1
    ? t("wording.completed")
    : (eventStatusResponse?.data?.data ?? []).find(
        status => status.id === Number(eventDetail?.status),
      )?.name ?? (eventDetail?.status ? `Status ${eventDetail.status}` : '—');
  const statusBadge = eventDetail?.is_complete === 1 ? "badge-green" : "badge-blue";

  const kpis: KpiItem[] = [
    { label:t("wording.totalItems"),  value:total,    sub:t("dynamic.totalQtyUnits", { count: totalQty }), accent:'brand',  style:{} },
    { label:t("wording.checked"),      value:checked,  sub:t("dynamic.percentAllItems", { count: totalSummary?.checked_percentage ?? pct(checked,total) }), accent:'green', style:{} },
    { label:t("wording.scanIn"),      value:scanIn,   sub:t("dynamic.percentScannedIn", { count: totalSummary?.scan_in_percentage ?? pct(scanIn,total) }), accent:'brand', style:{ borderLeftColor:'var(--purple)' } },
    { label:t("wording.scanOut"),     value:scanOut,  sub:t("dynamic.percentScannedOut", { count: totalSummary?.scan_out_percentage ?? pct(scanOut,total) }), accent:'green', style:{ borderLeftColor:'var(--green)' } },
    { label:t("wording.missing"),      value:missing,  sub:t("dynamic.percentItems", { count: pct(missing,total) }), accent:'red',   style:{}, valueStyle:{ color:'var(--red)' } },
    { label:t("wording.damaged"),      value:damaged,  sub:t("dynamic.percentItems", { count: pct(damaged,total) }), accent:'orange', style:{}, valueStyle:{ color:'var(--orange)' } },
  ];

  const progressBars = [
    { label:t("wording.checkingCompletion"), value:checked, total, color:'var(--brand)' },
    { label:t("wording.scanInCompletion"),  value:scanIn,  total, color:'var(--purple)' },
    { label:t("wording.scanOutCompletion"), value:scanOut, total, color:'var(--green)' },
  ];

  return (
    <div className="event-summary-page">
      <div className="breadcrumb">
        <Link to="/event">{t("wording.event")}</Link>
        <span className="breadcrumb-sep">/</span>
        {eventId ? (
          <Link to={`/event-detail?id=${eventId}`}>
            {eventDetail?.name || "Event Detail"}
          </Link>
        ) : (
          <span>{eventDetail?.name || "Event Detail"}</span>
        )}
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{t("wording.summary")}</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate('/event')} style={{ display:'flex', alignItems:'center', color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>
            <IconChevronLeft />
          </button>
          <h1 className="page-title" style={{ margin:0 }}>{t("wording.eventSummary")}</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-print" onClick={() => window.print()}><IconPrint /> {t("wording.printReport")}</button>
        </div>
      </div>

      {!eventId ? (
        <div className="card" style={{ marginBottom:22 }}>{t("wording.invalidOrMissingEventId")}</div>
      ) : isSummaryLoading || isDetailLoading ? (
        <div className="card" style={{ marginBottom:22 }}>{t("wording.loadingEventSummary")}</div>
      ) : isSummaryError || isDetailError ? (
        <div className="card" style={{ marginBottom:22 }}>{t("wording.failedToLoadEventSummary")}</div>
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
          <div className="event-info-chip"><span>{t("wording.codePrefix")} <strong>{eventDetail?.event_code || '—'}</strong></span></div>
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
        <div className="section-title">{t("wording.completionProgress")}</div>
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
      <div className="section-title">{t("wording.itemsByArea")}</div>
      <div className="area-grid">
        {Object.entries(areaMap).sort(([a],[b]) => a.localeCompare(b)).map(([name, a]) => {
          const cp = a.checkedPercentage ?? pct(a.checked, a.total);
          const sp = a.scanInPercentage ?? pct(a.scanIn, a.total);
          const sop = pct(a.scanOut ?? 0, a.total);
          return (
            <div key={name} className="area-stat-card" style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div className="area-stat-header">
                <span className="area-stat-name">{name}</span>
                <span className="area-stat-count">{a.total} {t("wording.itemInline")}{a.total !== 1 ? t("wording.s") : ''}</span>
              </div>
              {[
                { label:t("wording.checked"), color:'var(--brand)', val:cp },
                { label:t("wording.scanIn"), color:'var(--purple)', val:sp },
                { label:t("wording.scanOut"), color:'var(--green)', val:sop },
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
          <div className="section-title" style={{ margin:0, flex:1 }}>{t("wording.itemDetail")}</div>
          <div style={{ display:'flex', gap:7, alignItems:'center', flexWrap:'wrap' }}>
            <div className="search-wrap" style={{ maxWidth:220 }}>
              <IconSearch />
              <input className="search-input" type="text" placeholder={t("wording.searchItemsPlaceholder")} value={tableSearch} onChange={e => { setTableSearch(e.target.value); setTablePage(1); }} />
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
                { value: "", label: t("wording.allStatus") },
                ...statusNames.map((status) => ({ value: status, label: status })),
              ]}
              placeholder={t("wording.allStatus")}
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
                { value: "", label: t("wording.allAreas") },
                ...areaNames.map((area) => ({ value: area, label: area })),
              ]}
              placeholder={t("wording.allAreas")}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("wording.itemName")}</th>
                <th>{t("wording.area")}</th>
                <th>{t("wording.subArea")}</th>
                <th style={{ width:80, textAlign:'center' }}>{t("wording.qty")}</th>
                <th style={{ width:100, textAlign:'center' }}>{t("wording.status")}</th>
                <th style={{ width:90, textAlign:'center' }}>{t("wording.checking")}</th>
                <th style={{ width:90, textAlign:'center' }}>{t("wording.scanIn")}</th>
                <th style={{ width:90, textAlign:'center' }}>{t("wording.scanOut")}</th>
                <th>{t("wording.pic")}</th>
                <th>{t("wording.ownerships")}</th>
                <th>{t("wording.notes")}</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={11} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>{t("wording.noItemsFound")}</td></tr>
                : pageData.map(it => (
                  <tr key={it.id}>
                    <td style={{ fontWeight:500 }}>{it.name}</td>
                    <td><span className="badge badge-gray" style={{ fontSize:'10.5px', textTransform:'uppercase' }}>{it.area}</span></td>
                    <td>{it.subArea}</td>
                    <td style={{ textAlign:'center' }}>
                      {it.qty}{it.unit ? ` ${it.unit}` : ''}
                    </td>
                    <td style={{ textAlign:'center' }}><span className={`badge ${STATUS_BADGE[it.status] || 'badge-gray'}`}>{translateApiValue(it.status)}</span></td>
                    <td style={{ textAlign:'center' }}>{it.checking ? <DotOk /> : <DotNo />}</td>
                    <td style={{ textAlign:'center' }}>{it.scanIn   ? <DotOk /> : <DotNo />}</td>
                    <td style={{ textAlign:'center' }}>{it.scanOut  ? <DotOk /> : <DotNo />}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{it.pic || '—'}</td>
                    <td style={{ whiteSpace:'nowrap' }}>{it.ownerships}</td>
                    <td style={{ minWidth:160, whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{it.notes}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={tableFiltered.length} pageSize={TABLE_PAGE_SIZE} onPage={(p: number) => setTablePage(p)} label={t("wording.itemsInline")} />
      </div>

      <section className="event-summary-print-report" aria-hidden="true">
        <div className="event-summary-print-header">
          <div>
            <h1>{eventDetail?.name || t("wording.eventSummary")}</h1>
            <p>
              {fmtDate(eventDetail?.event_start)} - {fmtDate(eventDetail?.event_end)}
              {eventDetail?.address ? ` · ${eventDetail.address}` : ''}
            </p>
          </div>
          <div className="event-summary-print-code">
            {t("wording.codePrefix")} <strong>{eventDetail?.event_code || '—'}</strong>
          </div>
        </div>

        <table className="event-summary-print-table">
          <colgroup>
            <col className="print-col-number" />
            <col className="print-col-status" />
            <col className="print-col-pic" />
            <col className="print-col-code" />
            <col className="print-col-location" />
            <col className="print-col-item" />
            <col className="print-col-qty" />
            <col className="print-col-notes" />
          </colgroup>
          <thead>
            <tr>
              <th>{t("wording.rowNumber")}</th>
              <th>{t("wording.status")}</th>
              <th>{t("wording.pic")}</th>
              <th>{t("wording.ownerships")}</th>
              <th>{t("wording.subArea")}</th>
              <th>{t("wording.itemDetail")}</th>
              <th>{t("wording.qty")}</th>
              <th>{t("wording.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {printableAreaGroups.length === 0 ? (
              <tr>
                <td colSpan={8} className="event-summary-print-empty">
                  {t("wording.noItemsFound")}
                </td>
              </tr>
            ) : printableAreaGroups.map(([area, areaItems]) => (
              <Fragment key={area}>
                <tr className="event-summary-print-area">
                  <th colSpan={8}>{area.toUpperCase()}</th>
                </tr>
                {areaItems.map((item, index) => (
                  <tr key={`${area}-${item.id}`}>
                    <td className="print-cell-center">{index + 1}</td>
                    <td className="print-cell-center">{translateApiValue(item.status)}</td>
                    <td className="print-cell-center">
                      {index === 0 || areaItems[index - 1].pic !== item.pic ? item.pic : ''}
                    </td>
                    <td className="print-cell-center">{formatPrintOwnerships(item.ownerships)}</td>
                    <td>{item.subArea !== '—' ? item.subArea : item.area}</td>
                    <td>{item.name}</td>
                    <td className="print-cell-center">
                      {item.qty}{item.unit ? ` ${item.unit}` : ''}
                    </td>
                    <td>{item.notes}</td>
                  </tr>
                ))}
                <tr className="event-summary-print-spacer">
                  <td colSpan={8} />
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
