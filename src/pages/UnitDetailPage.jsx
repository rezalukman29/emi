import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Modal from '../components/Modal';
import { IconEdit, IconDelete } from '../components/icons';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

const units = [
  { id:1, name:'Piece',   abbr:'pcs',   desc:'Individual item count',                   itemCount:15, createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:2, name:'Meter',   abbr:'meter', desc:'Length measurement in meters',             itemCount:3,  createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:3, name:'Unit',    abbr:'unit',  desc:'Complete assembled unit',                  itemCount:7,  createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:4, name:'Roll',    abbr:'roll',  desc:'Material supplied in rolled form',         itemCount:1,  createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:5, name:'Set',     abbr:'set',   desc:'A matched collection of items',            itemCount:0,  createdAt:'2024-01-10', updatedAt:'2024-04-01' },
  { id:6, name:'Box',     abbr:'box',   desc:'Items packaged in a box',                  itemCount:0,  createdAt:'2024-01-10', updatedAt:'2024-04-01' },
];

function Field({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
      <span style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{value || <span style={{ color:'var(--border)' }}>—</span>}</span>
    </div>
  );
}

export default function UnitDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = parseInt(params.get('id'));
  const unit = units.find(u => u.id === id);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!unit) {
    return (
      <div style={{ padding:40, textAlign:'center' }}>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Unit not found.</p>
        <button className="btn-new" style={{ marginTop:12 }} onClick={() => navigate('/unit')}>Back to Unit</button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button
          onClick={() => navigate('/unit')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13, color:'var(--text-muted)', fontWeight:500 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <h1 className="page-title" style={{ margin:0, flex:1 }}>{unit.name}</h1>
        <button className="btn-icon edit" style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconEdit /> Edit
        </button>
        <button className="btn-icon delete" onClick={() => setDeleteOpen(true)} style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--red-bg)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconDelete /> Delete
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--brand)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Unit Info</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <Field label="Name" value={unit.name} />
            <Field label="Abbreviation" value={unit.abbr} />
            <Field label="Items Using" value={String(unit.itemCount)} />
            <div />
            <Field label="Created At" value={fmtDate(unit.createdAt)} />
            <Field label="Updated At" value={fmtDate(unit.updatedAt)} />
          </div>
          {unit.desc && (
            <div style={{ marginTop:18 }}>
              <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Description</span>
              <p style={{ fontSize:13.5, color:'var(--text)', marginTop:6, lineHeight:1.6 }}>{unit.desc}</p>
            </div>
          )}
        </div>

        <div className="card" style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
          <span style={{ fontSize:48, fontWeight:800, color:'var(--brand)', fontVariantNumeric:'tabular-nums' }}>{unit.itemCount}</span>
          <span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:500 }}>Items using this unit</span>
          <div style={{ marginTop:8, background:'var(--brand-bg)', padding:'6px 18px', borderRadius:20 }}>
            <span style={{ fontSize:16, fontWeight:700, color:'var(--brand)' }}>{unit.abbr}</span>
          </div>
        </div>
      </div>

      <Modal open={deleteOpen} title="Delete Unit" onClose={() => setDeleteOpen(false)}
        footer={<>
          <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
          <button className="btn-del-ok" onClick={() => { setDeleteOpen(false); navigate('/unit'); }}>Delete</button>
        </>}
      >
        <p className="confirm-msg">Are you sure you want to delete <strong>"{unit.name}"</strong>? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
