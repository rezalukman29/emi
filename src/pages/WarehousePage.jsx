import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../components/icons';
import { initialWarehouses } from '../data/warehouses';

function ImgCell({ src, name, onClick }) {
  return (
    <div
      onClick={onClick}
      title="View image"
      style={{ width:42, height:42, background:'var(--bg)', borderRadius:'var(--r)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--border)', margin:'auto', cursor:'pointer', transition:'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'}
      onMouseLeave={e => e.currentTarget.style.background='var(--bg)'}
    >
      {src
        ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'var(--r)' }} />
        : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width:18, height:18 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )
      }
    </div>
  );
}

function ImageViewerModal({ open, name, src, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
    >
      <div style={{ background:'#fff', borderRadius:14, maxWidth:480, width:'100%', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{name}</span>
          <button className="modal-close" onClick={onClose}><IconClose /></button>
        </div>
        <div style={{ padding:24, display:'flex', alignItems:'center', justifyContent:'center', minHeight:220, background:'var(--bg)' }}>
          {src
            ? <img src={src} alt={name} style={{ maxWidth:'100%', maxHeight:320, borderRadius:8, objectFit:'contain' }} />
            : (
              <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width:56, height:56, marginBottom:12, color:'var(--border)' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p style={{ fontSize:13, fontWeight:500 }}>No image uploaded</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function formatDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function WarehousePage() {
  const navigate = useNavigate();
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
  const [form, setForm] = useState({ name: '', location: '', pic: '', image: '' });
  const [imgPopup,   setImgPopup]   = useState({ open:false, name:'', src:null });

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
    setForm({ name: r.name, location: r.location, pic: r.pic, image: r.image || '' });
    setModalOpen(true);
  }

  function saveRow() {
    if (!form.name.trim()) return;
    const now = formatDate(new Date());
    if (editingId) {
      setWarehouses(ws => ws.map(w => w.id === editingId
        ? { ...w, name: form.name, location: form.location, pic: form.pic, image: form.image || w.image, updatedAt: now }
        : w
      ));
    } else {
      setWarehouses(ws => [...ws, {
        id: nextId, name: form.name, location: form.location,
        pic: form.pic, image: form.image || null, createdAt: now, updatedAt: '-',
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
                <th style={{ width:60, textAlign:'center' }}>Image</th>
                <th style={{ width:90, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No warehouses found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td>{r.location || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                    <td>{r.pic || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.createdAt}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.updatedAt === '-' ? <span style={{ color:'var(--border)' }}>—</span> : r.updatedAt}</td>
                    <td style={{ textAlign:'center' }}>
                      <ImgCell
                        src={r.image || null}
                        name={r.name}
                        onClick={() => setImgPopup({ open:true, name:r.name, src:r.image || null })}
                      />
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent:'center' }}>
                        <button className="btn-icon" title="View Detail" style={{ color:'var(--brand)' }} onClick={() => navigate(`/warehouse-detail?id=${r.id}`)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
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
        <div className="form-group">
          <label>Image URL</label>
          <input type="text" placeholder="https://…" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
          {form.image && (
            <img src={form.image} alt="preview" style={{ marginTop:8, maxWidth:'100%', maxHeight:120, borderRadius:6, objectFit:'contain', border:'1px solid var(--border)' }} />
          )}
        </div>
      </Modal>

      <ImageViewerModal
        open={imgPopup.open}
        name={imgPopup.name}
        src={imgPopup.src}
        onClose={() => setImgPopup(p => ({ ...p, open:false }))}
      />

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
