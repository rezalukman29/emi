import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { IconSearch, IconPlus, IconClose, IconCheck } from '../components/icons';
import { initialItemLoans } from '../data/itemLoans';
import type { ItemLoan } from '../data/itemLoans';
import { inventoryData } from '../data/inventory';
import { TODAY } from '../data/events';

const PAGE_SIZE = 8;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type LoanStatus = 'Dikembalikan' | 'Terlambat' | 'Dipinjam';
interface LoanForm {
  inventoryId: number | string;
  qty: number | string;
  borrowerName: string;
  borrowerContact: string;
  purpose: string;
  loanDate: string;
  dueDate: string;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function todayIso() {
  return TODAY.toISOString().slice(0, 10);
}

function loanStatus(loan: ItemLoan): LoanStatus {
  if (loan.returnDate) return 'Dikembalikan';
  return new Date(loan.dueDate) < TODAY ? 'Terlambat' : 'Dipinjam';
}

function statusBadgeClass(status: LoanStatus) {
  if (status === 'Dikembalikan') return 'badge-green';
  if (status === 'Terlambat') return 'badge-red';
  return 'badge-blue';
}

function emptyForm(): LoanForm {
  return { inventoryId: inventoryData[0]?.id ?? '', qty: 1, borrowerName: '', borrowerContact: '', purpose: '', loanDate: todayIso(), dueDate: '' };
}

export default function ItemLoanPage() {
  const [loans, setLoans] = useState(initialItemLoans);
  const [nextId, setNextId] = useState(initialItemLoans.length + 1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const withStatus = useMemo(() => loans.map(l => ({ ...l, computedStatus: loanStatus(l) })), [loans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus.filter(l =>
      (!q || l.itemName.toLowerCase().includes(q) || l.borrowerName.toLowerCase().includes(q)) &&
      (!statusFilter || l.computedStatus === statusFilter)
    );
  }, [withStatus, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const dipinjamCount = withStatus.filter(l => l.computedStatus === 'Dipinjam').length;
  const terlambatCount = withStatus.filter(l => l.computedStatus === 'Terlambat').length;
  const dikembalikanCount = withStatus.filter(l => l.computedStatus === 'Dikembalikan').length;

  function openNew() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function saveLoan() {
    if (!form.borrowerName.trim() || !form.dueDate) return;
    const inv = inventoryData.find(i => i.id === Number(form.inventoryId));
    if (!inv) return;
    setLoans(ls => [{
      id: nextId, itemName: inv.name, sku: inv.sku, category: inv.category, unit: inv.unit,
      warehouse: inv.warehouse, qty: Math.max(1, Number(form.qty) || 1),
      borrowerName: form.borrowerName.trim(), borrowerContact: form.borrowerContact.trim(),
      purpose: form.purpose.trim(), loanDate: form.loanDate, dueDate: form.dueDate, returnDate: null,
    }, ...ls]);
    setNextId(n => n + 1);
    setModalOpen(false);
  }

  function returnLoan(id: number) {
    setLoans(ls => ls.map(l => l.id === id ? { ...l, returnDate: todayIso() } : l));
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Item Loan</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> Pinjam Barang</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Peminjaman', value: loans.length,        color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Sedang Dipinjam',  value: dipinjamCount,       color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Terlambat',        value: terlambatCount,      color: 'var(--red)',    bg: 'var(--red-bg)' },
          { label: 'Dikembalikan',     value: dikembalikanCount,   color: 'var(--green)',  bg: 'var(--green-bg)' },
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
                className="search-input" type="text" placeholder="Cari barang atau peminjam…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">Semua Status</option>
                <option value="Dipinjam">Dipinjam</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Dikembalikan">Dikembalikan</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Barang</th>
                <th>Peminjam</th>
                <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
                <th>Gudang</th>
                <th style={{ width: 110 }}>Tgl Pinjam</th>
                <th style={{ width: 110 }}>Jatuh Tempo</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 100, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Tidak ada peminjaman ditemukan.</td></tr>
                : pageData.map(l => (
                  <tr key={l.id}>
                    <td className="name-cell">{l.itemName}<div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.purpose}</div></td>
                    <td>{l.borrowerName}<div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.borrowerContact}</div></td>
                    <td style={{ textAlign: 'right' }}>{l.qty} {l.unit}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.warehouse}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{fmtDate(l.loanDate)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{fmtDate(l.dueDate)}</td>
                    <td><span className={`badge ${statusBadgeClass(l.computedStatus)}`}>{l.computedStatus}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {l.computedStatus === 'Dikembalikan'
                        ? <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtDate(l.returnDate)}</span>
                        : <button className="btn-icon" title="Tandai Dikembalikan" style={{ color: 'var(--green)' }} onClick={() => returnLoan(l.id)}><IconCheck /></button>
                      }
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={(p: number) => setPage(p)} label="peminjaman" />
      </div>

      <Modal
        open={modalOpen}
        title="Pinjam Barang"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Batal</button>
            <button className="btn-save-modal" onClick={saveLoan}><IconCheck /> Simpan</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Barang <span style={{ color: 'var(--red)' }}>*</span></label>
            <select value={form.inventoryId} onChange={e => setForm(f => ({ ...f, inventoryId: e.target.value }))}>
              {inventoryData.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Qty</label>
            <input type="number" min={1} value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nama Peminjam <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="text" value={form.borrowerName} onChange={e => setForm(f => ({ ...f, borrowerName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Kontak</label>
            <input type="text" placeholder="No. HP / email" value={form.borrowerContact} onChange={e => setForm(f => ({ ...f, borrowerContact: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Keperluan</label>
          <input type="text" placeholder="Untuk keperluan apa barang dipinjam" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tanggal Pinjam</label>
            <input type="date" value={form.loanDate} onChange={e => setForm(f => ({ ...f, loanDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Jatuh Tempo <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </>
  );
}
