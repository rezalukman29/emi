import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../components/icons';
import { initialAreas, SUB_AREAS } from '../data/areas';

const PAGE_SIZE = 10;

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function buildFlatSubAreas() {
  let id = 1;
  const rows = [];
  const base = new Date('2024-01-10');
  Object.entries(SUB_AREAS).forEach(([areaName, subs]) => {
    subs.forEach((sub, i) => {
      const d = new Date(base.getTime() + (id * 3 + i) * 24 * 3600 * 1000);
      const iso = d.toISOString().slice(0, 10);
      rows.push({ id: id++, name: sub, area: areaName, createdAt: iso, updatedAt: iso });
    });
  });
  return rows;
}

const initialSubAreas = buildFlatSubAreas();

export default function SubAreaPage() {
  const [subAreas,   setSubAreas]   = useState(initialSubAreas);
  const [nextId,     setNextId]     = useState(initialSubAreas.length + 1);
  const [query,      setQuery]      = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [sortCol,    setSortCol]    = useState(-1);
  const [sortAsc,    setSortAsc]    = useState(true);
  const [page,       setPage]       = useState(1);

  const [subAreaModal,  setSubAreaModal]  = useState(false);
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [editingId,     setEditingId]     = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [form, setForm] = useState({ name: '', area: '' });

  const areaNames = useMemo(() => initialAreas.map(a => a.name).filter(n => SUB_AREAS[n]?.length > 0), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = subAreas.filter(r => {
      const mQ = !q || r.name.toLowerCase().includes(q) || r.area.toLowerCase().includes(q);
      const mA = !areaFilter || r.area === areaFilter;
      return mQ && mA;
    });
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0)      { va = a.name;      vb = b.name; }
        else if (sortCol === 1) { va = a.area;      vb = b.area; }
        else if (sortCol === 2) { va = a.createdAt; vb = b.createdAt; }
        else if (sortCol === 3) { va = a.updatedAt; vb = b.updatedAt; }
        else return 0;
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return data;
  }, [subAreas, query, areaFilter, sortCol, sortAsc]);

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
    setForm({ name: '', area: areaNames[0] || '' });
    setSubAreaModal(true);
  }

  function openEdit(id) {
    const r = subAreas.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name: r.name, area: r.area });
    setSubAreaModal(true);
  }

  function save() {
    if (!form.name.trim() || !form.area) return;
    const now = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setSubAreas(as => as.map(a => a.id === editingId ? { ...a, name: form.name, area: form.area, updatedAt: now } : a));
    } else {
      setSubAreas(as => [...as, { id: nextId, name: form.name, area: form.area, createdAt: now, updatedAt: now }]);
      setNextId(n => n + 1);
    }
    setSubAreaModal(false);
  }

  function openDelete(id) { setDeleteTarget(id); setDeleteModal(true); }
  function confirmDelete() { setSubAreas(as => as.filter(a => a.id !== deleteTarget)); setDeleteModal(false); }

  const deleteRecord = subAreas.find(x => x.id === deleteTarget);
  const areaCount    = [...new Set(subAreas.map(r => r.area))].length;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Sub Area</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Sub Area</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'Total Sub Areas', value:subAreas.length,          color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Parent Areas',    value:areaCount,                color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Search Results',  value:filtered.length,          color:'var(--purple)', bg:'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search sub area…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={areaFilter} onChange={e => { setAreaFilter(e.target.value); setPage(1); }}>
                <option value="">All Areas</option>
                {areaNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
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
                <SortTh label="Sub Area" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Area"     colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:160 }} />
                <SortTh label="Created At" colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <SortTh label="Updated At" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <th style={{ width:100, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={5} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No sub areas found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize:'11px', fontWeight:600 }}>{r.area}</span>
                    </td>
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
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="sub areas" />
      </div>

      <Modal
        open={subAreaModal}
        title={editingId ? 'Edit Sub Area' : 'New Sub Area'}
        onClose={() => setSubAreaModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setSubAreaModal(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={save}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Sub Area Name <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Altar Setup" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Parent Area <span style={{ color:'var(--red)' }}>*</span></label>
          <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}>
            <option value="">— Select Area —</option>
            {areaNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Sub Area"
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
