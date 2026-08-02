// TypeScript page component.
import { useState, useMemo } from 'react';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SortTh from '../../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../../components/icons';
import { initialDefaultUnits } from '../../data/defaultUnits';

const PAGE_SIZE = 10;
const TYPES = ['Length', 'Weight', 'Volume', 'Count'];

function emptyForm() {
  return { name: '', abbr: '', type: 'Length', status: 'active' };
}

export default function DefaultUnitsPage() {
  const [units, setUnits] = useState(initialDefaultUnits);
  const [nextId, setNextId] = useState(initialDefaultUnits.length + 1);
  const [query, setQuery] = useState('');
  const [sortCol, setSortCol] = useState(-1);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = units.filter(r => !q || r.name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q));
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0) { va = a.name; vb = b.name; }
        else if (sortCol === 1) { va = a.abbr; vb = b.abbr; }
        else if (sortCol === 3) { va = a.usageCount; vb = b.usageCount; }
        else return 0;
        if (typeof va === 'number') return sortAsc ? va - Number(vb) : Number(vb) - va;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return data;
  }, [units, query, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col: number) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const r = units.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, abbr: r.abbr, type: r.type, status: r.status });
    setModalOpen(true);
  }

  function saveRow() {
    if (!form.name.trim() || !form.abbr.trim()) return;
    if (editingId) {
      setUnits(us => us.map(u => u.id === editingId ? { ...u, name: form.name.trim(), abbr: form.abbr.trim(), type: form.type, status: form.status } : u));
    } else {
      setUnits(us => [...us, { id: nextId, name: form.name.trim(), abbr: form.abbr.trim(), type: form.type, status: form.status, usageCount: 0 }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function openDelete(id: number) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setUnits(us => us.filter(u => u.id !== deletingId)); setDeleteOpen(false); }

  const delTarget = units.find(u => u.id === deletingId);
  const activeCount = units.filter(u => u.status === 'active').length;
  const totalUsage = units.reduce((s, u) => s + u.usageCount, 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Default Units</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Unit</button>
      </div>
      <p className="summary-text">Template measurement units (e.g. cm, m, kg) offered to every new customer.</p>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total Units',    value: units.length, color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Active',         value: activeCount,   color: 'var(--green)',  bg: 'var(--green-bg)' },
          { label: 'Customers Using',value: totalUsage,    color: 'var(--purple)', bg: 'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search unit…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name"         colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Abbreviation" colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 110 }} />
                <th style={{ width: 100 }}>Type</th>
                <SortTh label="Customers Using" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 150, textAlign: 'right' }} />
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 100, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No units found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '3px 9px', background: 'var(--brand-bg)', color: 'var(--brand)', borderRadius: 5, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '.02em' }}>{r.abbr}</span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: '12.5px' }}>{r.type}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.usageCount}</td>
                    <td><span className={`badge badge-${r.status === 'active' ? 'green' : 'gray'}`}>{r.status}</span></td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon edit" title="Edit" onClick={() => openEdit(r.id)}><IconEdit /></button>
                        <button className="btn-icon delete" title="Delete" onClick={() => openDelete(r.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="units" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Unit' : 'New Unit'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveRow}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Unit Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="text" placeholder="e.g. Centimeter" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Abbreviation <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="text" placeholder="e.g. cm" value={form.abbr} onChange={e => setForm(f => ({ ...f, abbr: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Unit"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok" onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{delTarget?.name}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
