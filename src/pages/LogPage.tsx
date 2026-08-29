import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import { IconSearch } from '../components/icons';
import { initialActivityLogs } from '../data/activityLogs';
import { TODAY } from '../data/events';
import SearchableSelect from '../components/SearchableSelect';

const PAGE_SIZE = 10;
const ACTIONS = ['Login', 'Logout', 'Create', 'Update', 'Delete'];
const MODULES = [...new Set(initialActivityLogs.map(l => l.module))].sort();

function actionBadgeClass(action: string) {
  if (action === 'Create') return 'badge-green';
  if (action === 'Update') return 'badge-blue';
  if (action === 'Delete') return 'badge-red';
  if (action === 'Login') return 'badge-purple';
  return 'badge-gray';
}

function todayIso() {
  return TODAY.toISOString().slice(0, 10);
}

export default function LogPage() {
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialActivityLogs.filter(l =>
      (!q || l.description.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q)) &&
      (!moduleFilter || l.module === moduleFilter) &&
      (!actionFilter || l.action === actionFilter)
    );
  }, [query, moduleFilter, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const todayCount = initialActivityLogs.filter(l => l.timestamp.startsWith(todayIso())).length;
  const activeUserCount = new Set(initialActivityLogs.map(l => l.userName)).size;

  return (
    <>
      <h1 className="page-title">Log</h1>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total Logs',      value: initialActivityLogs.length, color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: "Today's Activity", value: todayCount,               color: 'var(--green)',  bg: 'var(--green-bg)' },
          { label: 'Active Users',      value: activeUserCount,            color: 'var(--purple)', bg: 'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search activity or user…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <SearchableSelect
              inline
              value={moduleFilter}
              onChange={value => { setModuleFilter(String(value)); setPage(1); }}
              options={[
                { value: '', label: 'All Modules' },
                ...MODULES.map(module => ({ value: module, label: module })),
              ]}
              placeholder="All Modules"
              searchPlaceholder="Search modules…"
            />
            <SearchableSelect
              inline
              value={actionFilter}
              onChange={value => { setActionFilter(String(value)); setPage(1); }}
              options={[
                { value: '', label: 'All Actions' },
                ...ACTIONS.map(action => ({ value: action, label: action })),
              ]}
              placeholder="All Actions"
              searchPlaceholder="Search actions…"
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Time</th>
                <th style={{ width: 130 }}>User</th>
                <th style={{ width: 90 }}>Action</th>
                <th style={{ width: 150 }}>Module</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No logs found.</td></tr>
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
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={(p: number) => setPage(p)} label="logs" />
      </div>
    </>
  );
}
