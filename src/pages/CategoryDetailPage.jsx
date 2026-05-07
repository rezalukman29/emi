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

const ITEM_COUNTS = { Floral:3, Furniture:3, Lighting:0, Fabric:3, Decoration:8, Equipment:3 };
const BADGE_COLORS = {
  Floral:     { color:'var(--green)',  bg:'var(--green-bg)' },
  Furniture:  { color:'var(--brand)',  bg:'var(--brand-bg)' },
  Lighting:   { color:'var(--orange)', bg:'var(--orange-bg)' },
  Fabric:     { color:'var(--purple)', bg:'var(--purple-bg)' },
  Decoration: { color:'var(--text-2)', bg:'var(--bg)' },
  Equipment:  { color:'var(--red)',    bg:'var(--red-bg)' },
};

const categories = [
  { id:1, name:'Floral',      desc:'Fresh and artificial flower arrangements',     itemCount: ITEM_COUNTS.Floral,      createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:2, name:'Furniture',   desc:'Tables, chairs, and seating equipment',        itemCount: ITEM_COUNTS.Furniture,   createdAt:'2024-01-05', updatedAt:'2024-03-10' },
  { id:3, name:'Lighting',    desc:'Stage and ambiance lighting equipment',        itemCount: ITEM_COUNTS.Lighting,    createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:4, name:'Fabric',      desc:'Linens, drapes, and fabric materials',         itemCount: ITEM_COUNTS.Fabric,      createdAt:'2024-01-05', updatedAt:'2024-03-12' },
  { id:5, name:'Decoration',  desc:'Ornamental and decorative event accessories',  itemCount: ITEM_COUNTS.Decoration,  createdAt:'2024-01-05', updatedAt:'2024-04-01' },
  { id:6, name:'Equipment',   desc:'Technical and functional event equipment',     itemCount: ITEM_COUNTS.Equipment,   createdAt:'2024-01-05', updatedAt:'2024-04-01' },
];

const categoryItems = {
  Floral:     [{ name:'Artificial Flower Chrysant Giant White', sku:'AFG-001' },{ name:'Artificial Flower Lunaria White', sku:'AFL-002' },{ name:'Artificial Rose Pink', sku:'ARP-003' }],
  Furniture:  [{ name:'Gebyok Jati Ukiran', sku:'GJU-010' },{ name:'Kursi Tiffany Putih', sku:'KTP-013' },{ name:'Meja Buffet Putih', sku:'MBP-015' }],
  Fabric:     [{ name:'Fabric Putih Polos 3m', sku:'FPP-008' },{ name:'Kain Batik Wahyu Tumurun', sku:'KBW-012' },{ name:'Taplak Meja Putih 2x1m', sku:'TMP-017' }],
  Decoration: [{ name:'Balon Latex Putih', sku:'BLP-005' },{ name:'Candle Holder Bulat Besar', sku:'CHB-006' },{ name:'Crystal Bentuk Tabung', sku:'CBT-007' },{ name:'Flower Arch Besi 60cm', sku:'FAB-009' },{ name:'Janur Kuning', sku:'JKN-011' },{ name:'Lilin Merah Besar', sku:'LMB-014' },{ name:'Pita Emas Roll', sku:'PER-016' },{ name:'Vase Keramik Putih Tinggi', sku:'VKP-020' }],
  Equipment:  [{ name:'Backdrop Stand 2m', sku:'BSD-004' },{ name:'Tealight Holder Lama Tinggi 15cm', sku:'THL-018' },{ name:'Tripod Kamera Mini', sku:'TKM-019' }],
};

function Field({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
      <span style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{value || <span style={{ color:'var(--border)' }}>—</span>}</span>
    </div>
  );
}

export default function CategoryDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = parseInt(params.get('id'));
  const cat = categories.find(c => c.id === id);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!cat) {
    return (
      <div style={{ padding:40, textAlign:'center' }}>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Category not found.</p>
        <button className="btn-new" style={{ marginTop:12 }} onClick={() => navigate('/category')}>Back to Category</button>
      </div>
    );
  }

  const clr = BADGE_COLORS[cat.name] || { color:'var(--text-2)', bg:'var(--bg)' };
  const items = categoryItems[cat.name] || [];

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button
          onClick={() => navigate('/category')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13, color:'var(--text-muted)', fontWeight:500 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <span style={{ display:'inline-flex', padding:'5px 14px', background:clr.bg, color:clr.color, borderRadius:8, fontWeight:700, fontSize:18 }}>{cat.name}</span>
        <div style={{ flex:1 }} />
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
            <span style={{ width:8, height:8, borderRadius:'50%', background:clr.color }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Category Info</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <Field label="Name" value={cat.name} />
            <Field label="Item Count" value={String(cat.itemCount)} />
            <Field label="Created At" value={fmtDate(cat.createdAt)} />
            <Field label="Updated At" value={fmtDate(cat.updatedAt)} />
          </div>
          {cat.desc && (
            <div style={{ marginTop:18 }}>
              <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Description</span>
              <p style={{ fontSize:13.5, color:'var(--text)', marginTop:6, lineHeight:1.6 }}>{cat.desc}</p>
            </div>
          )}
        </div>
        <div className="stat-card" style={{ margin:0 }}>
          <div className="stat-icon" style={{ background:clr.bg }}>
            <span className="stat-value" style={{ color:clr.color }}>{cat.itemCount}</span>
          </div>
          <span className="stat-label">Total Items</span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card">
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:14 }}>Items in this Category</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th style={{ width:90 }}>SKU</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="name-cell">{item.name}</td>
                    <td className="id-cell">{item.sku}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={deleteOpen} title="Delete Category" onClose={() => setDeleteOpen(false)}
        footer={<>
          <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
          <button className="btn-del-ok" onClick={() => { setDeleteOpen(false); navigate('/category'); }}>Delete</button>
        </>}
      >
        <p className="confirm-msg">Are you sure you want to delete <strong>"{cat.name}"</strong>? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
