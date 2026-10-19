import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadProductions } from '../lib/reportData';
import Pagination from './Pagination';
import { fmtNum } from '../lib/format';

export default function ProductionLogTab({ vendorId }: { vendorId?: number }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery(['production-log'], loadProductions, { staleTime: 30000 });
  const rows = (query.data || []).filter(row => (!vendorId || row.vendor_id === vendorId) && `${row.item_name} ${row.eventName}`.toLowerCase().includes(search.toLowerCase()));
  const safePage = Math.min(page, Math.max(1, Math.ceil(rows.length / 25)));
  return <section className="card"><div className="oct-toolbar"><h3>{t('october.productionLog')}</h3><input placeholder={t('wording.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
    <p className="ed-lock-note">{t('october.productionNote')}</p>
    {query.isLoading ? <p>{t('wording.loading')}</p> : query.isError ? <p role="alert">{t('october.loadError')}</p> : <div className="table-wrap"><table><thead><tr>{['item', 'qty', 'event', 'status'].map(key => <th key={key}>{t(`october.${key}`)}</th>)}</tr></thead><tbody>{rows.slice((safePage - 1) * 25, safePage * 25).map(row => <tr key={`${row.eventId}-${row.type}-${row.id}`}><td>{row.item_name || row.new_item?.nama || '—'}</td><td>{fmtNum(row.qty ?? row.new_item?.qty)}</td><td><Link to={`/event-detail?id=${row.eventId}`}>{row.eventName}</Link></td><td>{row.status}</td></tr>)}{!rows.length && <tr><td colSpan={4}>{t('eventUpgrade.noRequests')}</td></tr>}</tbody></table></div>}
    {!query.isLoading && !query.isError && <Pagination currentPage={safePage} total={rows.length} pageSize={25} onPage={setPage} />}
  </section>;
}
