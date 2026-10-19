import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadEvents } from '../lib/reportData';
import Pagination from '../components/Pagination';

export default function EventReportPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery(['report-events'], loadEvents);
  const rows = (query.data || []).filter(row => `${row.name} ${row.address || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-content"><h2>{t('wording.eventSummary')}</h2><div className="oct-toolbar"><input aria-label={t('wording.searchEvents')} placeholder={t('wording.searchEvents')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>{query.isLoading ? <p>{t('wording.loading')}</p> : query.isError ? <p role="alert">{t('october.loadError')}</p> : <><div className="table-wrap"><table><thead><tr><th>{t('october.event')}</th><th>{t('october.date')}</th></tr></thead><tbody>{rows.slice((page - 1) * 25, page * 25).map(row => <tr key={row.id}><td><Link to={`/event-summary?id=${row.id}`}>{String(row.name || row.description || row.id)}</Link></td><td>{String(row.date_event || row.event_start || '—')}</td></tr>)}</tbody></table></div><Pagination currentPage={page} total={rows.length} pageSize={25} onPage={setPage} /></>}</div>;
}
