import { useState, useMemo } from 'react';
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

const initialUnits = [
  { id:1, name:'Piece',   abbr:'pcs',   desc:'Individual item count',                   itemCount:15, createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:2, name:'Meter',   abbr:'meter', desc:'Length measurement in meters',             itemCount:3,  createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:3, name:'Unit',    abbr:'unit',  desc:'Complete assembled unit',                  itemCount:7,  createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:4, name:'Roll',    abbr:'roll',  desc:'Material supplied in rolled form',         itemCount:1,  createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:5, name:'Set',     abbr:'set',   desc:'A matched collection of items',            itemCount:0,  createdAt:'2024-01-10', updatedAt:'2024-04-01' },
  { id:6, name:'Box',     abbr:'box',   desc:'Items packaged in a box',                  itemCount:0,  createdAt:'2024-01-10', updatedAt:'2024-04-01' },
];

export default function UnitPage() {
  const [units,        setUnits]        = useState(initialUnits);
  const [nextId,       setNextId]       = useState(initialUnits.length + 1);
  const [query,        setQuery]        = useState('');
  const [sortCol,      setSortCol]      = useState(-1);
  const [sortAsc,      setSortAsc]      = useState(true);
  const [page,         setPage]         = useState(1);

  const [unitModal,    setUnitModal]    = useState(false);
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', abbr: '', desc: '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = units.filter(r => !q || r.name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q));
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0)      { va = a.name;             vb = b.name; }
        else if (sortCol === 1) { va = a.abbr;             vb = b.abbr; }
        else if (sortCol === 3) { va = String(a.itemCount); vb = String(b.itemCount); }
        else if (sortCol === 4) { va = a.createdAt;        vb = b.createdAt; }
        else if (sortCol === 5) { va = a.updatedAt;        vb = b.updatedAt; }
        else return 0;
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
    }
    return data;
  }, [units, query, sortCol, sortAsc]);

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
    setForm({ name: '', abbr: '', desc: '' });
    setUnitModal(true);
  }

  function openEdit(id) {
    const r = units.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, abbr: r.abbr, desc: r.desc || '' });
    setUnitModal(true);
  }

  function save() {
    if (!form.name.trim() || !form.abbr.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setUnits(us => us.map(u => u.id === editingId ? { ...u, name: form.name, abbr: form.abbr, desc: form.desc, updatedAt: now } : u));
    } else {
      setUnits(us => [...us, { id: nextId, name: form.name, abbr: form.abbr, desc: form.desc, itemCount: 0, createdAt: now, updatedAt: now }]);
      setNextId(n => n + 1);
    }
    setUnitModal(false);
  }

  function openDelete(id) { setDeleteTarget(id); setDeleteModal(true); }
  function confirmDelete() { setUnits(us => us.filter(u => u.id !== deleteTarget)); setDeleteModal(false); }

  const deleteRecord = units.find(x => x.id === deleteTarget);
  const totalItems   = units.reduce((a, u) => a + u.itemCount, 0);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Unit</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Unit</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'Total Units',   value:units.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Total Items',   value:totalItems,   color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Search Results',value:filtered.length, color:'var(--purple)', bg:'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search unit…"
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
                <SortTh label="Abbreviation"colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:110 }} />
                <th>Description</th>
                <SortTh label="Items"       colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:80, textAlign:'right' }} />
                <SortTh label="Created At"  colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <SortTh label="Updated At"  colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <th style={{ width:100, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No units found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td>
                      <span style={{ display:'inline-block', padding:'3px 9px', background:'var(--brand-bg)', color:'var(--brand)', borderRadius:5, fontSize:12, fontWeight:700, fontFamily:'monospace', letterSpacing:'.02em' }}>{r.abbr}</span>
                    </td>
                    <td style={{ color:'var(--text-2)', fontSize:'12.5px' }}>{r.desc || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600, color: r.itemCount > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{r.itemCount}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{fmtDate(r.createdAt)}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{fmtDate(r.updatedAt)}</td>
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
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="units" />
      </div>

      <Modal
        open={unitModal}
        title={editingId ? 'Edit Unit' : 'New Unit'}
        onClose={() => setUnitModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setUnitModal(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={save}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Unit Name <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Piece" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Abbreviation <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. pcs" value={form.abbr} onChange={e => setForm(f => ({ ...f, abbr: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea placeholder="Short description (optional)" rows={2} style={{ resize:'vertical' }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Unit"
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
