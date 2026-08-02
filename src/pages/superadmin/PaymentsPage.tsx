// TypeScript page component.
import { useState, useMemo } from 'react';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SortTh from '../../components/SortTh';
import { IconSearch, IconClose } from '../../components/icons';
import { initialPayments, type Payment } from '../../data/payments';
import { formatIDR, paymentStatusBadge } from '../../lib/superAdminUtils';

const cols: (keyof Payment)[] = ['invoiceNo', 'customer', 'plan', 'amount', 'method', 'status', 'date'];
const PAGE_SIZE = 8;
const STATUSES = ['paid', 'pending', 'failed', 'refunded'];

export default function PaymentsPage() {
  const [payments] = useState(initialPayments);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortCol, setSortCol] = useState(6);
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Payment | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let data = payments.filter(p =>
      (!q || p.invoiceNo.toLowerCase().includes(q) || p.customer.toLowerCase().includes(q)) &&
      (!statusFilter || p.status === statusFilter)
    );
    const key = cols[sortCol] || 'date';
    data.sort((a, b) => {
      const va = a[key], vb = b[key];
      if (typeof va === 'number') return sortAsc ? va - Number(vb) : Number(vb) - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return data;
  }, [payments, query, statusFilter, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col: number) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  const totalPaid = useMemo(() => payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0), [payments]);
  const totalPending = payments.filter(p => p.status === 'pending').length;
  const totalFailed = payments.filter(p => p.status === 'failed').length;

  return (
    <>
      <h1 className="page-title">Payments</h1>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Revenue',       value: formatIDR(totalPaid), color: 'var(--green)',  bg: 'var(--green-bg)' },
          { label: 'Total Transactions',  value: payments.length,      color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Pending',             value: totalPending,         color: 'var(--orange)', bg: 'var(--orange-bg)' },
          { label: 'Failed',              value: totalFailed,          color: 'var(--red)',    bg: 'var(--red-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color, fontSize: typeof s.value === 'string' ? 13 : 20 }}>{s.value}</span>
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
                className="search-input" type="text" placeholder="Search invoice, customer…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Invoice #" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 140 }} />
                <SortTh label="Customer"  colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Plan"      colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="Amount"    colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 130 }} />
                <SortTh label="Method"    colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 130 }} />
                <SortTh label="Status"    colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="Date"      colIndex={6} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 110 }} />
                <th style={{ width: 70, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No payments found.</td></tr>
                : pageData.map(p => (
                  <tr key={p.id}>
                    <td className="id-cell">{p.invoiceNo}</td>
                    <td className="name-cell">{p.customer}</td>
                    <td>{p.plan}</td>
                    <td>{formatIDR(p.amount)}</td>
                    <td>{p.method}</td>
                    <td><span className={`badge badge-${paymentStatusBadge(p.status)}`}>{p.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{p.date}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon" title="View Detail" onClick={() => setDetail(p)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={(p: number) => setPage(p)} label="payments" />
      </div>

      <Modal
        open={!!detail}
        title="Payment Detail"
        onClose={() => setDetail(null)}
        footer={<button className="btn-cancel-modal" onClick={() => setDetail(null)}><IconClose /> Close</button>}
      >
        {detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Invoice', detail.invoiceNo],
              ['Customer', detail.customer],
              ['Plan', detail.plan],
              ['Amount', formatIDR(detail.amount)],
              ['Method', detail.method],
              ['Status', detail.status],
              ['Date', detail.date],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-2)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{k}</span>
                <strong style={{ fontSize: 13 }}>{v}</strong>
              </div>
            ))}
          </div>
        ) : <></>}
      </Modal>
    </>
  );
}
