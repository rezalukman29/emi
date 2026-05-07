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

const initialStatuses = [
  { id:1,  order:1, status:'Created by admin up',  showScan:false, action:'',        eventRunning:0,  updatedAt:'2024-01-10' },
  { id:2,  order:2, status:'On preparing items',   showScan:false, action:'',        eventRunning:2,  updatedAt:'2024-01-10' },
  { id:3,  order:3, status:'Finish setup',          showScan:false, action:'',        eventRunning:1,  updatedAt:'2024-01-12' },
  { id:4,  order:4, status:'Waiting scan in',       showScan:true,  action:'SCAN IN', eventRunning:3,  updatedAt:'2024-01-15' },
  { id:5,  order:5, status:'Event running',         showScan:false, action:'',        eventRunning:5,  updatedAt:'2024-02-01' },
  { id:6,  order:6, status:'Waiting scan out',      showScan:true,  action:'SCAN OUT',eventRunning:2,  updatedAt:'2024-02-05' },
  { id:7,  order:7, status:'Finished',              showScan:false, action:'',        eventRunning:12, updatedAt:'2024-02-10' },
  { id:8,  order:8, status:'Postphone',             showScan:false, action:'',        eventRunning:1,  updatedAt:'2024-03-01' },
  { id:9,  order:9, status:'Disable',               showScan:false, action:'',        eventRunning:0,  updatedAt:'2024-03-05' },
];

function ScanBadge({ show }) {
  return show
    ? <span className="badge badge-green" style={{ fontSize:'11px' }}>Yes</span>
    : <span className="badge badge-gray"  style={{ fontSize:'11px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', fontWeight:400 }}>No</span>;
}

function ActionBadge({ action }) {
  if (action === 'SCAN IN')  return <span className="badge badge-blue"   style={{ fontSize:'11px', letterSpacing:'.03em' }}>SCAN IN</span>;
  if (action === 'SCAN OUT') return <span className="badge badge-orange" style={{ fontSize:'11px', letterSpacing:'.03em' }}>SCAN OUT</span>;
  return <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>—</span>;
}

export default function EventStatusPage() {
  const [statuses,     setStatuses]     = useState(initialStatuses);
  const [nextId,       setNextId]       = useState(initialStatuses.length + 1);
  const [query,        setQuery]        = useState('');
  const [sortCol,      setSortCol]      = useState(-1);
  const [sortAsc,      setSortAsc]      = useState(true);
  const [page,         setPage]         = useState(1);

  const [statusModal,  setStatusModal]  = useState(false);
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ status: '', showScan: false, action: '', order: '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = statuses.filter(r => !q || r.status.toLowerCase().includes(q));
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0)      { va = String(a.order);       vb = String(b.order); }
        else if (sortCol === 1) { va = a.status;              vb = b.status; }
        else if (sortCol === 4) { va = String(a.eventRunning);vb = String(b.eventRunning); }
        else if (sortCol === 5) { va = a.updatedAt;           vb = b.updatedAt; }
        else return 0;
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
    }
    return data;
  }, [statuses, query, sortCol, sortAsc]);

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
    setForm({ status: '', showScan: false, action: '', order: String(statuses.length + 1) });
    setStatusModal(true);
  }

  function openEdit(id) {
    const r = statuses.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ status: r.status, showScan: r.showScan, action: r.action, order: String(r.order) });
    setStatusModal(true);
  }

  function save() {
    if (!form.status.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setStatuses(ss => ss.map(s => s.id === editingId
        ? { ...s, status: form.status, showScan: form.showScan, action: form.action, order: parseInt(form.order) || s.order, updatedAt: now }
        : s
      ));
    } else {
      setStatuses(ss => [...ss, { id: nextId, order: parseInt(form.order) || ss.length + 1, status: form.status, showScan: form.showScan, action: form.action, eventRunning: 0, updatedAt: now }]);
      setNextId(n => n + 1);
    }
    setStatusModal(false);
  }

  function moveOrder(id, dir) {
    setStatuses(ss => {
      const sorted = [...ss].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(s => s.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= sorted.length) return ss;
      const aOrder = sorted[idx].order;
      const bOrder = sorted[swapIdx].order;
      return ss.map(s => {
        if (s.id === sorted[idx].id)   return { ...s, order: bOrder };
        if (s.id === sorted[swapIdx].id) return { ...s, order: aOrder };
        return s;
      });
    });
  }

  function openDelete(id) { setDeleteTarget(id); setDeleteModal(true); }
  function confirmDelete() { setStatuses(ss => ss.filter(s => s.id !== deleteTarget)); setDeleteModal(false); }

  const deleteRecord   = statuses.find(x => x.id === deleteTarget);
  const runningTotal   = statuses.reduce((a, s) => a + s.eventRunning, 0);
  const scanEnabled    = statuses.filter(s => s.showScan).length;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Event Status</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Status</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'Total Statuses',  value:statuses.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Scan Enabled',    value:scanEnabled,     color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Events Running',  value:runningTotal,    color:'var(--orange)', bg:'var(--orange-bg)' },
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
                className="search-input" type="text" placeholder="Search status…"
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
                <SortTh label="Order"         colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:70, textAlign:'center' }} />
                <th style={{ width:80, textAlign:'center' }}>Edit Order</th>
                <SortTh label="Status"        colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <th style={{ width:100, textAlign:'center' }}>Show Scan</th>
                <th style={{ width:110, textAlign:'center' }}>Scan Action</th>
                <SortTh label="Event Running" colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120, textAlign:'right' }} />
                <SortTh label="Updated At"    colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:120 }} />
                <th style={{ width:100, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No statuses found.</td></tr>
                : pageData.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ textAlign:'center' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, background:'var(--brand-bg)', color:'var(--brand)', borderRadius:6, fontWeight:700, fontSize:13 }}>{r.order}</span>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <div style={{ display:'inline-flex', flexDirection:'column', gap:2 }}>
                        <button
                          className="btn-icon"
                          title="Move up"
                          style={{ padding:'2px 5px', color: idx === 0 ? 'var(--border)' : 'var(--text-muted)' }}
                          disabled={idx === 0}
                          onClick={() => moveOrder(r.id, -1)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:12, height:12 }}><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button
                          className="btn-icon"
                          title="Move down"
                          style={{ padding:'2px 5px', color: idx === pageData.length - 1 ? 'var(--border)' : 'var(--text-muted)' }}
                          disabled={idx === pageData.length - 1}
                          onClick={() => moveOrder(r.id, 1)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:12, height:12 }}><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                    </td>
                    <td className="name-cell">{r.status}</td>
                    <td style={{ textAlign:'center' }}><ScanBadge show={r.showScan} /></td>
                    <td style={{ textAlign:'center' }}><ActionBadge action={r.action} /></td>
                    <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600 }}>
                      {r.eventRunning > 0
                        ? <span style={{ color:'var(--orange)' }}>{r.eventRunning}</span>
                        : <span style={{ color:'var(--text-muted)' }}>0</span>}
                    </td>
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
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="statuses" />
      </div>

      <Modal
        open={statusModal}
        title={editingId ? 'Edit Event Status' : 'New Event Status'}
        onClose={() => setStatusModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setStatusModal(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={save}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Order <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="number" min="1" placeholder="e.g. 1" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Status Name <span style={{ color:'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Event running" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Scan Action</label>
          <select value={form.action} onChange={e => {
            const action = e.target.value;
            setForm(f => ({ ...f, action, showScan: action !== '' }));
          }}>
            <option value="">None</option>
            <option value="SCAN IN">SCAN IN</option>
            <option value="SCAN OUT">SCAN OUT</option>
          </select>
        </div>
        <div className="form-group" style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          <input
            type="checkbox" id="showScan" checked={form.showScan}
            onChange={e => setForm(f => ({ ...f, showScan: e.target.checked }))}
            style={{ width:16, height:16, cursor:'pointer' }}
          />
          <label htmlFor="showScan" style={{ marginBottom:0, cursor:'pointer', userSelect:'none' }}>Show Scan Button</label>
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Event Status"
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteModal(false)}>Cancel</button>
            <button className="btn-del-ok"        onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteRecord?.status}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
