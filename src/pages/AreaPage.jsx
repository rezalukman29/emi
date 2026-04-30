import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconFolder, IconClose, IconCheck } from '../components/icons';
import { initialAreas, SUB_AREAS } from '../data/areas';

const PAGE_SIZE = 10;

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

export default function AreaPage() {
  const [areas,         setAreas]        = useState(initialAreas);
  const [nextId,        setNextId]       = useState(16);
  const [query,         setQuery]        = useState('');
  const [sortCol,       setSortCol]      = useState(-1);
  const [sortAsc,       setSortAsc]      = useState(true);
  const [page,          setPage]         = useState(1);

  const [areaModal,     setAreaModal]    = useState(false);
  const [deleteModal,   setDeleteModal]  = useState(false);
  const [subAreaModal,  setSubAreaModal] = useState(false);
  const [editingId,     setEditingId]    = useState(null);
  const [deleteTarget,  setDeleteTarget] = useState(null);
  const [subAreaTarget, setSubAreaTarget]= useState(null);
  const [form, setForm] = useState({ name: '', desc: '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = areas.filter(r =>
      r.name.toLowerCase().includes(q) || (r.desc && r.desc.toLowerCase().includes(q))
    );
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0) { va = a.name; vb = b.name; }
        else if (sortCol === 3) { va = a.createdAt; vb = b.createdAt; }
        else if (sortCol === 4) { va = a.updatedAt; vb = b.updatedAt; }
        else return 0;
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return data;
  }, [areas, query, sortCol, sortAsc]);

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
    setAreaModal(true);
  }

  function openEdit(id) {
    const r = areas.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, desc: r.desc || '' });
    setAreaModal(true);
  }

  function saveArea() {
    if (!form.name.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setAreas(as => as.map(a => a.id === editingId ? { ...a, name: form.name, desc: form.desc, updatedAt: now } : a));
    } else {
      setAreas(as => [...as, { id: nextId, name: form.name, desc: form.desc, createdAt: now, updatedAt: now }]);
      setNextId(n => n + 1);
    }
    setAreaModal(false);
  }

  function openDelete(id) { setDeleteTarget(id);  setDeleteModal(true); }
  function confirmDelete() { setAreas(as => as.filter(a => a.id !== deleteTarget)); setDeleteModal(false); }
  function openSubAreas(id) { setSubAreaTarget(id); setSubAreaModal(true); }

  const subAreaRecord  = areas.find(x => x.id === subAreaTarget);
  const subs           = subAreaRecord ? (SUB_AREAS[subAreaRecord.name] || []) : [];
  const deleteRecord   = areas.find(x => x.id === deleteTarget);

  const totalSubAreas  = Object.values(SUB_AREAS).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Area</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Area</button>
      </div>

      {/* Stats */}
      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'Total Areas',     value:areas.length,    color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Total Sub Areas', value:totalSubAreas,   color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Search Results',  value:filtered.length, color:'var(--purple)', bg:'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search area…"
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
                <th>Description</th>
                <th style={{ width:110, textAlign:'center' }}>Sub Areas</th>
                <SortTh label="Created At" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <SortTh label="Updated At" colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <th style={{ width:110, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No areas found.</td></tr>
                : pageData.map(r => {
                    const subCount = (SUB_AREAS[r.name] || []).length;
                    return (
                      <tr key={r.id}>
                        <td className="name-cell">{r.name}</td>
                        <td style={{ color:'var(--text-2)', fontSize:'12.5px' }}>{r.desc || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                        <td style={{ textAlign:'center' }}>
                          {subCount > 0 ? (
                            <button
                              onClick={() => openSubAreas(r.id)}
                              style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}
                              title={`View ${subCount} sub areas`}
                            >
                              <span className="badge badge-blue" style={{ cursor:'pointer' }}>{subCount} sub area{subCount !== 1 ? 's' : ''}</span>
                            </button>
                          ) : (
                            <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>—</span>
                          )}
                        </td>
                        <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{fmtDate(r.updatedAt)}</td>
                        <td>
                          <div className="action-btns" style={{ justifyContent:'center' }}>
                            <button className="btn-icon" title="View sub areas" onClick={() => openSubAreas(r.id)}><IconFolder /></button>
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
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="areas" />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={areaModal}
        title={editingId ? 'Edit Area' : 'New Area'}
        onClose={() => setAreaModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setAreaModal(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={saveArea}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Name <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. CEREMONY" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea placeholder="Short description (optional)" rows={3} style={{ resize:'vertical' }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        title="Delete Area"
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

      {/* Sub Areas Modal */}
      <Modal
        open={subAreaModal}
        title={`Sub Areas — ${subAreaRecord?.name || ''}`}
        onClose={() => setSubAreaModal(false)}
        size="lg"
        footer={<button className="btn-ghost btn" onClick={() => setSubAreaModal(false)}>Close</button>}
      >
        {subs.length === 0 ? (
          <p style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>No sub areas defined.</p>
        ) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'4px 0' }}>
            {subs.map((s, i) => (
              <span key={i} style={{
                display:'inline-flex', alignItems:'center', gap:5,
                background:'var(--bg)', border:'1px solid var(--border)',
                borderRadius:8, padding:'6px 12px', fontSize:13, fontWeight:500, color:'var(--text-2)',
              }}>
                {s}
              </span>
            ))}
          </div>
        )}
        <p style={{ fontSize:'11.5px', color:'var(--text-muted)', marginTop:14 }}>
          {subs.length} sub area{subs.length !== 1 ? 's' : ''} in <strong>{subAreaRecord?.name}</strong>
        </p>
      </Modal>
    </>
  );
}
