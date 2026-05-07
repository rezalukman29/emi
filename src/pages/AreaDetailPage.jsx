import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Modal from '../components/Modal';
import { IconEdit, IconDelete } from '../components/icons';
import { initialAreas, SUB_AREAS } from '../data/areas';

function Field({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
      <span style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{value || <span style={{ color:'var(--border)' }}>—</span>}</span>
    </div>
  );
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

export default function AreaDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = parseInt(params.get('id'));
  const area = initialAreas.find(a => a.id === id);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!area) {
    return (
      <div style={{ padding:40, textAlign:'center' }}>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Area not found.</p>
        <button className="btn-new" style={{ marginTop:12 }} onClick={() => navigate('/area')}>Back to Area</button>
      </div>
    );
  }

  const subAreas = (SUB_AREAS[area.name] || []);
  const subAreaCount = subAreas.length;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button
          onClick={() => navigate('/area')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13, color:'var(--text-muted)', fontWeight:500 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <h1 className="page-title" style={{ margin:0, flex:1 }}>{area.name}</h1>
        <button className="btn-icon edit" style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconEdit /> Edit
        </button>
        <button className="btn-icon delete" onClick={() => setDeleteOpen(true)} style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--red-bg)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconDelete /> Delete
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--brand)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Area Info</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <Field label="Name" value={area.name} />
            <Field label="Sub Areas" value={String(subAreaCount)} />
            <Field label="Created At" value={fmtDate(area.createdAt)} />
            <Field label="Updated At" value={fmtDate(area.updatedAt)} />
          </div>
          {area.desc && (
            <div style={{ marginTop:18 }}>
              <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Description</span>
              <p style={{ fontSize:13.5, color:'var(--text)', marginTop:6, lineHeight:1.6 }}>{area.desc}</p>
            </div>
          )}
        </div>

        <div className="stats-bar" style={{ gridTemplateColumns:'1fr', alignContent:'start', gap:12, background:'transparent', border:'none', padding:0 }}>
          {[
            { label:'Total Sub Areas', value: subAreaCount, color:'var(--brand)',  bg:'var(--brand-bg)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ margin:0 }}>
              <div className="stat-icon" style={{ background:s.bg }}>
                <span className="stat-value" style={{ color:s.color }}>{s.value}</span>
              </div>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {subAreas.length > 0 && (
        <div className="card">
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:14 }}>Sub Areas</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {subAreas.map((sa, i) => (
                  <tr key={i}>
                    <td className="name-cell">{sa.name || sa}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{sa.desc || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={deleteOpen} title="Delete Area" onClose={() => setDeleteOpen(false)}
        footer={<>
          <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
          <button className="btn-del-ok" onClick={() => { setDeleteOpen(false); navigate('/area'); }}>Delete</button>
        </>}
      >
        <p className="confirm-msg">Are you sure you want to delete <strong>"{area.name}"</strong>? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
