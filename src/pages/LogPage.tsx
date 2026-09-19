import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import { IconSearch } from '../components/icons';
import { initialActivityLogs } from '../data/activityLogs';
import SearchableSelect from '../components/SearchableSelect';
import { useTranslation } from "react-i18next";
import { useEventLifecycle } from '../lib/eventLifecycle';

const PAGE_SIZE = 10;
const ACTIONS = ['Login', 'Logout', 'Create', 'Update', 'Delete'];

function actionBadgeClass(action: string) {
  if (action === 'Create') return 'badge-green';
  if (action === 'Update') return 'badge-blue';
  if (action === 'Delete') return 'badge-red';
  if (action === 'Login') return 'badge-purple';
  return 'badge-gray';
}

export default function LogPage() {
  const lifecycle = useEventLifecycle();
  const activityLogs = useMemo(() => [...lifecycle.logs.map(log => ({ ...log, userName: log.user })), ...initialActivityLogs], [lifecycle.logs]);
  const modules = useMemo(() => [...new Set(activityLogs.map(log => log.module))].sort(), [activityLogs]);
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activityLogs.filter(l =>
      (!q || l.description.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q)) &&
      (!moduleFilter || l.module === moduleFilter) &&
      (!actionFilter || l.action === actionFilter)
    );
  }, [query, moduleFilter, actionFilter, activityLogs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const todayCount = activityLogs.filter(l => l.timestamp.startsWith(new Date().toISOString().slice(0, 10))).length;
  const activeUserCount = new Set(activityLogs.map(l => l.userName)).size;

  return (
    <>
      <h1 className="page-title">{t("wording.log")}</h1>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: t("wording.totalLogs"),      value: activityLogs.length, color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: t("wording.todaysActivity"), value: todayCount,               color: 'var(--green)',  bg: 'var(--green-bg)' },
          { label: t("wording.activeUsers"),      value: activeUserCount,            color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
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
                className="search-input" type="text" placeholder={t("wording.searchActivityOrUser")}
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <SearchableSelect
              inline
              value={moduleFilter}
              onChange={value => { setModuleFilter(String(value)); setPage(1); }}
              options={[
                { value: '', label: t("wording.allModules") },
                ...modules.map(module => ({ value: module, label: module })),
              ]}
              placeholder={t("wording.allModules")}
              searchPlaceholder={t("wording.searchModules")}
            />
            <SearchableSelect
              inline
              value={actionFilter}
              onChange={value => { setActionFilter(String(value)); setPage(1); }}
              options={[
                { value: '', label: t("wording.allActions") },
                ...ACTIONS.map(action => ({ value: action, label: action })),
              ]}
              placeholder={t("wording.allActions")}
              searchPlaceholder={t("wording.searchActions")}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>{t("wording.time")}</th>
                <th style={{ width: 130 }}>{t("wording.user")}</th>
                <th style={{ width: 90 }}>{t("wording.action")}</th>
                <th style={{ width: 150 }}>{t("wording.module")}</th>
                <th>{t("wording.description")}</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>{t("wording.noLogsFound")}</td></tr>
                : pageData.map(l => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{l.timestamp}</td>
                    <td className="name-cell">{l.userName}</td>
                    <td><span className={`badge ${actionBadgeClass(l.action)}`}>{l.action}</span></td>
                    <td>{l.module}</td>
                    <td style={{ color: 'var(--text-2)' }}>{l.description}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={(p: number) => setPage(p)} label={t("wording.logs")} />
      </div>
    </>
  );
}
