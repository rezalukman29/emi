import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../components/icons';
import { initialWarehouses } from '../data/warehouses';

const PAGE_SIZE = 10;

function formatDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState(initialWarehouses);
  const [nextId,     setNextId]     = useState(11);
  const [query,      setQuery]      = useState('');
  const [sortCol,    setSortCol]    = useState(0);
  const [sortAsc,    setSortAsc]    = useState(true);
  const [page,       setPage]       = useState(1);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', pic: '' });

  const cols = ['name', 'location', 'pic', 'createdAt', 'updatedAt'];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let data = q
      ? warehouses.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.pic.toLowerCase().includes(q)
        )
      : [...warehouses];
    const key = cols[sortCol] || 'name';
    data.sort((a, b) => {
      const va = String(a[key] ?? ''), vb = String(b[key] ?? '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [warehouses, query, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function openNew() {
    setEditingId(null);
    setForm({ name: '', location: '', pic: '' });
    setModalOpen(true);
  }

  function openEdit(id) {
    const r = warehouses.find(w => w.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, location: r.location, pic: r.pic });
    setModalOpen(true);
  }

  function saveRow() {
    if (!form.name.trim()) return;
    const now = formatDate(new Date());
    if (editingId) {
      setWarehouses(ws => ws.map(w => w.id === editingId
        ? { ...w, name: form.name, location: form.location, pic: form.pic, updatedAt: now }
        : w
      ));
    } else {
      setWarehouses(ws => [...ws, {
        id: nextId, name: form.name, location: form.location,
        pic: form.pic, createdAt: now, updatedAt: '-',
      }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function openDelete(id) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setWarehouses(ws => ws.filter(w => w.id !== deletingId)); setDeleteOpen(false); }

  const delTarget       = warehouses.find(w => w.id === deletingId);
  const uniqueLocations = [...new Set(warehouses.map(w => w.location).filter(Boolean))].length;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Warehouse</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Warehouse</button>
      </div>

      {/* Stats */}
      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'Total Warehouses', value:warehouses.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Locations',        value:uniqueLocations,    color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Search Results',   value:filtered.length,    color:'var(--purple)', bg:'var(--purple-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}>
              <span className="stat-value" style={{ color:s.color }}>{s.value}</span>
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
                className="search-input" type="text" placeholder="Search warehouse…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <button className="btn-search">Search</button>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name"       colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Location"   colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="PIC"        colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:130 }} />
                <SortTh label="Created At" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:165 }} />
                <SortTh label="Updated At" colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:165 }} />
                <th style={{ width:90, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No warehouses found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td>{r.location || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                    <td>{r.pic || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.createdAt}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.updatedAt === '-' ? <span style={{ color:'var(--border)' }}>—</span> : r.updatedAt}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent:'center' }}>
                        <button className="btn-icon edit"   title="Edit"   onClick={() => openEdit(r.id)}><IconEdit /></button>
                        <button className="btn-icon delete" title="Delete" onClick={() => openDelete(r.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} label="warehouses" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Warehouse' : 'New Warehouse'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={saveRow}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Name <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Gudang Bali 66" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input type="text" placeholder="e.g. Bali, Jakarta" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>PIC</label>
          <input type="text" placeholder="Person in charge" value={form.pic} onChange={e => setForm(f => ({ ...f, pic: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Warehouse"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok"        onClick={confirmDelete}>Delete</button>
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
