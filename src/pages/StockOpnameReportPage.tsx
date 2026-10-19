import { Fragment, useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { getStockOpname, type StockOpnameHistoryRecord } from '../hooks/api/useGetStockOpname';
import SearchableSelect from '../components/SearchableSelect';
import { downloadCsv } from '../lib/exportCsv';
import { fmtNum } from '../lib/format';

function statusOf(row: StockOpnameHistoryRecord) {
  const status = row.status?.trim().toUpperCase();
  if (status && status !== 'PENDING') return status === 'APPLIED' ? 'APPROVED' : status;
  return row.flag?.toLowerCase() === 'done' || row.is_applied ? 'APPROVED' : 'PENDING';
}

export default function StockOpnameReportPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('APPROVED');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouses, setWarehouses] = useState<Array<string | number>>([]);
  const query = useQuery(['opname-report'], async () => {
    const first = await getStockOpname({ page: 1, limit: 100 });
    const rows = [...first.data];
    for (let page = 2; page <= first.total_pages; page++) rows.push(...(await getStockOpname({ page, limit: 100 })).data);
    return rows;
  });
  const rows = (query.data || []).filter(row => `${row.warehouse_name || row.gudang_name || ''} ${row.period || ''}`.toLowerCase().includes(search.toLowerCase()) && (!status || statusOf(row) === status)
    && (!from || (row.created_at || '').slice(0, 10) >= from)
    && (!to || Boolean(row.created_at) && row.created_at!.slice(0, 10) <= to)
    && (!warehouses.length || warehouses.includes(row.warehouse_name || row.gudang_name || '')));
  const warehouseOptions = [...new Set((query.data || []).map(row => row.warehouse_name || row.gudang_name).filter(Boolean))].map(name => ({ value: name!, label: name! }));
  const statuses = [...new Set(['APPROVED', 'PENDING', 'REJECTED', ...(query.data || []).map(statusOf)])];
  const lines = rows.flatMap(row => row.items || row.details || row.data || []);
  const delta = (row: typeof lines[number]) => {
    const before = row.stock_old ?? row.stok_awal ?? row.stok_sebelum ?? row.stok_sistem ?? row.stok;
    const after = row.stock_new ?? row.stok_aktual ?? row.actual_stock;
    return before == null || after == null ? null : after - before;
  };
  function exportReport() {
    downloadCsv('stock-opname-report.csv', [
      ['Date', 'Warehouse', 'Status', 'Item', 'Difference'],
      ...rows.flatMap(row => (row.items || row.details || row.data || []).map(item => [
        row.created_at, item.warehouse_name || item.gudang_name || row.warehouse_name || row.gudang_name,
        statusOf(row), item.item_name || item.nama_barang || item.barang?.nama, delta(item),
      ])),
    ]);
  }
  return <div className="page-content"><h2>{t('october.opnameReport')}</h2><div className="oct-toolbar"><input placeholder={t('wording.search')} value={search} onChange={e => setSearch(e.target.value)} /><select aria-label={t('october.status')} value={status} onChange={e => setStatus(e.target.value)}><option value="">{t('wording.allStatus')}</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select><SearchableSelect inline multiple value={warehouses} onChange={setWarehouses} options={warehouseOptions} placeholder={t('october.warehouse')} />
    <label>{t('october.from')} <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label>
    <label>{t('october.to')} <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
    <button className="btn btn-ghost" onClick={exportReport} disabled={query.isLoading || query.isError}>{t('october.exportCsv')}</button>
    <button className="btn btn-ghost" onClick={() => window.print()}>{t('wording.print')}</button></div>
    {query.isLoading ? <p>{t('wording.loading')}</p> : query.isError ? <p role="alert">{t('october.loadError')}</p> : <>
      <div className="oct-toolbar"><span>{t('october.reports')}: <strong>{fmtNum(rows.length)}</strong></span><span>{t('october.lines')}: <strong>{fmtNum(lines.length)}</strong></span><span>{t('october.difference')}: <strong>{fmtNum(lines.length && lines.every(row => delta(row) != null) ? lines.reduce((sum, row) => sum + delta(row)!, 0) : null)}</strong></span></div>
      <p className="ed-lock-note">{t('october.opnameNote')}</p>
      <div className="table-wrap"><table><thead><tr>{['date', 'warehouse', 'status', 'item', 'difference'].map(key => <th key={key}>{t(`october.${key}`)}</th>)}</tr></thead><tbody>{rows.map(row => <Fragment key={row.id}><tr><td>{row.period || row.created_at || '—'}</td><td>{row.warehouse_name || row.gudang_name || '—'}</td><td>{statusOf(row)}</td><td colSpan={2}>{row.remark}</td></tr>{(row.items || row.details || row.data || []).map((item, index) => <tr key={`${row.id}-${index}`}><td /><td>{item.warehouse_name || item.gudang_name}</td><td>{item.condition}</td><td>{item.item_name || item.nama_barang || item.barang?.nama || '—'}</td><td>{fmtNum(delta(item))}</td></tr>)}</Fragment>)}{!rows.length && <tr><td colSpan={5}>{t('october.notFound')}</td></tr>}</tbody></table></div>
    </>}
  </div>;
}
