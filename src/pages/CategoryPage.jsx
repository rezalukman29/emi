import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../components/icons';

const PAGE_SIZE = 10;

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

const ITEM_COUNTS = { Floral:3, Furniture:3, Lighting:0, Fabric:3, Decoration:8, Equipment:3 };

const initialCategories = [
  { id:1, name:'Floral',      desc:'Fresh and artificial flower arrangements',     itemCount: ITEM_COUNTS.Floral,      createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:2, name:'Furniture',   desc:'Tables, chairs, and seating equipment',        itemCount: ITEM_COUNTS.Furniture,   createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:3, name:'Lighting',    desc:'Stage and ambiance lighting equipment',        itemCount: ITEM_COUNTS.Lighting,    createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:4, name:'Fabric',      desc:'Linens, drapes, and fabric materials',         itemCount: ITEM_COUNTS.Fabric,      createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:5, name:'Decoration',  desc:'Ornamental and decorative event accessories',  itemCount: ITEM_COUNTS.Decoration,  createdAt:'2024-01-05', updatedAt:'2024-04-01' },
  { id:6, name:'Equipment',   desc:'Technical and functional event equipment',     itemCount: ITEM_COUNTS.Equipment,   createdAt:'2024-01-05', updatedAt:'2024-04-01' },
];

const BADGE_COLORS = {
  Floral:     { color:'var(--green)',  bg:'var(--green-bg)' },
  Furniture:  { color:'var(--brand)',  bg:'var(--brand-bg)' },
  Lighting:   { color:'var(--orange)', bg:'var(--orange-bg)' },
  Fabric:     { color:'var(--purple)', bg:'var(--purple-bg)' },
  Decoration: { color:'var(--text-2)', bg:'var(--bg)' },
  Equipment:  { color:'var(--red)',    bg:'var(--red-bg)' },
};

export default function CategoryPage() {
  const navigate = useNavigate();
  const [categories,   setCategories]   = useState(initialCategories);
  const [nextId,       setNextId]       = useState(initialCategories.length + 1);
  const [query,        setQuery]        = useState('');
  const [sortCol,      setSortCol]      = useState(-1);
  const [sortAsc,      setSortAsc]      = useState(true);
  const [page,         setPage]         = useState(1);

  const [catModal,     setCatModal]     = useState(false);
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', desc: '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = categories.filter(r => !q || r.name.toLowerCase().includes(q) || (r.desc && r.desc.toLowerCase().includes(q)));
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0)      { va = a.name;             vb = b.name; }
        else if (sortCol === 2) { va = String(a.itemCount); vb = String(b.itemCount); }
        else if (sortCol === 3) { va = a.createdAt;        vb = b.createdAt; }
        else if (sortCol === 4) { va = a.updatedAt;        vb = b.updatedAt; }
        else return 0;
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
    }
    return data;
  }, [categories, query, sortCol, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage   = Math.min(page, Math.max(1, totalPages));
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function openNew() {
    setEditingId(null);
    setForm({ name: '', desc: '' });
    setCatModal(true);
  }

  function openEdit(id) {
    const r = categories.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, desc: r.desc || '' });
    setCatModal(true);
  }

  function save() {
    if (!form.name.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setCategories(cs => cs.map(c => c.id === editingId ? { ...c, name: form.name, desc: form.desc, updatedAt: now } : c));
    } else {
      setCategories(cs => [...cs, { id: nextId, name: form.name, desc: form.desc, itemCount: 0, createdAt: now, updatedAt: now }]);
      setNextId(n => n + 1);
    }
    setCatModal(false);
  }

  function openDelete(id) { setDeleteTarget(id); setDeleteModal(true); }
  function confirmDelete() { setCategories(cs => cs.filter(c => c.id !== deleteTarget)); setDeleteModal(false); }

  const deleteRecord  = categories.find(x => x.id === deleteTarget);
  const totalItems    = categories.reduce((a, c) => a + c.itemCount, 0);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Category</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Category</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'Total Categories', value:categories.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Total Items',      value:totalItems,        color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Search Results',   value:filtered.length,   color:'var(--purple)', bg:'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search category…"
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
                <SortTh label="Name"        colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <th>Description</th>
                <SortTh label="Items"       colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:80, textAlign:'right' }} />
                <SortTh label="Created At"  colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <SortTh label="Updated At"  colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <th style={{ width:100, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No categories found.</td></tr>
                : pageData.map(r => {
                    const clr = BADGE_COLORS[r.name] || { color:'var(--text-2)', bg:'var(--bg)' };
                    return (
                      <tr key={r.id}>
                        <td>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', background:clr.bg, color:clr.color, borderRadius:6, fontWeight:600, fontSize:12.5 }}>{r.name}</span>
                        </td>
                        <td style={{ color:'var(--text-2)', fontSize:'12.5px' }}>{r.desc || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                        <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600, color: r.itemCount > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{r.itemCount}</td>
                        <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{fmtDate(r.updatedAt)}</td>
                        <td>
                          <div className="action-btns" style={{ justifyContent:'center' }}>
                            <button className="btn-icon" title="View Detail" style={{ color:'var(--brand)' }} onClick={() => navigate(`/category-detail?id=${r.id}`)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button className="btn-icon edit"   title="Edit"   onClick={() => openEdit(r.id)}><IconEdit /></button>
                            <button className="btn-icon delete" title="Delete" onClick={() => openDelete(r.id)}><IconDelete /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="categories" />
      </div>

      <Modal
        open={catModal}
        title={editingId ? 'Edit Category' : 'New Category'}
        onClose={() => setCatModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setCatModal(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={save}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Name <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Floral" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea placeholder="Short description (optional)" rows={3} style={{ resize:'vertical' }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Category"
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteModal(false)}>Cancel</button>
            <button className="btn-del-ok"        onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteRecord?.name}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
