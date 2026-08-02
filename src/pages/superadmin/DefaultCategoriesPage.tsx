// TypeScript page component.
import { useState, useMemo } from 'react';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SortTh from '../../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../../components/icons';
import { initialDefaultCategories } from '../../data/defaultCategories';

const PAGE_SIZE = 10;

function emptyForm() {
  return { name: '', desc: '', status: 'active' };
}

export default function DefaultCategoriesPage() {
  const [categories, setCategories] = useState(initialDefaultCategories);
  const [nextId, setNextId] = useState(initialDefaultCategories.length + 1);
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
    let data = categories.filter(r => !q || r.name.toLowerCase().includes(q) || (r.desc && r.desc.toLowerCase().includes(q)));
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0) { va = a.name; vb = b.name; }
        else if (sortCol === 2) { va = a.usageCount; vb = b.usageCount; }
        else return 0;
        if (typeof va === 'number') return sortAsc ? va - Number(vb) : Number(vb) - va;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return data;
  }, [categories, query, sortCol, sortAsc]);

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
    const r = categories.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, desc: r.desc || '', status: r.status });
    setModalOpen(true);
  }

  function saveRow() {
    if (!form.name.trim()) return;
    if (editingId) {
      setCategories(cs => cs.map(c => c.id === editingId ? { ...c, name: form.name.trim(), desc: form.desc.trim(), status: form.status } : c));
    } else {
      setCategories(cs => [...cs, { id: nextId, name: form.name.trim(), desc: form.desc.trim(), status: form.status, usageCount: 0 }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function openDelete(id: number) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setCategories(cs => cs.filter(c => c.id !== deletingId)); setDeleteOpen(false); }

  const delTarget = categories.find(c => c.id === deletingId);
  const activeCount = categories.filter(c => c.status === 'active').length;
  const totalUsage = categories.reduce((s, c) => s + c.usageCount, 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Default Categories</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Category</button>
      </div>
      <p className="summary-text">Template categories offered to every new customer when their account is provisioned.</p>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total Categories', value: categories.length, color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Active',           value: activeCount,        color: 'var(--green)',  bg: 'var(--green-bg)' },
          { label: 'Customers Using',  value: totalUsage,         color: 'var(--purple)', bg: 'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search category…"
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
                <SortTh label="Name" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <th>Description</th>
                <SortTh label="Customers Using" colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 150, textAlign: 'right' }} />
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 100, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No categories found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: '12.5px' }}>{r.desc || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
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
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="categories" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Category' : 'New Category'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveRow}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Name <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Floral" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea placeholder="Short description (optional)" rows={3} style={{ resize: 'vertical' }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Category"
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
