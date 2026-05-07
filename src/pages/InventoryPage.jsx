import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose } from '../components/icons';

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

const inventoryData = [
  { id:1,  name:'Artificial Flower Chrysant Giant White', sku:'AFG-001', category:'Floral',     unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:342, stockStatus:'Available',    updatedAt:'12 Mar 2025' },
  { id:2,  name:'Artificial Flower Lunaria White',        sku:'AFL-002', category:'Floral',     unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:327, stockStatus:'Available',    updatedAt:'10 Mar 2025' },
  { id:3,  name:'Artificial Rose Pink',                   sku:'ARP-003', category:'Floral',     unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:182, stockStatus:'Available',    updatedAt:'08 Mar 2025' },
  { id:4,  name:'Backdrop Stand 2m',                      sku:'BSD-004', category:'Equipment',  unit:'unit',  warehouse:'Gudang C9',        totalStock:8,   stockStatus:'Low Stock',    updatedAt:'07 Mar 2025' },
  { id:5,  name:'Balon Latex Putih',                      sku:'BLP-005', category:'Decoration', unit:'pcs',   warehouse:'Gudang Surabaya',  totalStock:500, stockStatus:'Available',    updatedAt:'-' },
  { id:6,  name:'Candle Holder Bulat Besar',              sku:'CHB-006', category:'Decoration', unit:'pcs',   warehouse:'Gudang Bali 70',   totalStock:60,  stockStatus:'Available',    updatedAt:'-' },
  { id:7,  name:'Crystal Bentuk Tabung',                  sku:'CBT-007', category:'Decoration', unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:100, stockStatus:'Available',    updatedAt:'-' },
  { id:8,  name:'Fabric Putih Polos 3m',                  sku:'FPP-008', category:'Fabric',     unit:'meter', warehouse:'Gudang Cililitan', totalStock:20,  stockStatus:'Low Stock',    updatedAt:'05 Mar 2025' },
  { id:9,  name:'Flower Arch Besi 60cm',                  sku:'FAB-009', category:'Decoration', unit:'unit',  warehouse:'Gudang Bali 70',   totalStock:12,  stockStatus:'Available',    updatedAt:'-' },
  { id:10, name:'Gebyok Jati Ukiran',                     sku:'GJU-010', category:'Furniture',  unit:'unit',  warehouse:'Gudang Cililitan', totalStock:2,   stockStatus:'Low Stock',    updatedAt:'01 Mar 2025' },
  { id:11, name:'Janur Kuning',                           sku:'JKN-011', category:'Decoration', unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:50,  stockStatus:'Available',    updatedAt:'-' },
  { id:12, name:'Kain Batik Wahyu Tumurun',               sku:'KBW-012', category:'Fabric',     unit:'meter', warehouse:'Gudang Cililitan', totalStock:80,  stockStatus:'Available',    updatedAt:'28 Feb 2025' },
  { id:13, name:'Kursi Tiffany Putih',                    sku:'KTP-013', category:'Furniture',  unit:'unit',  warehouse:'Gudang Bali 66',   totalStock:80,  stockStatus:'Available',    updatedAt:'20 Feb 2025' },
  { id:14, name:'Lilin Merah Besar',                      sku:'LMB-014', category:'Decoration', unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:50,  stockStatus:'Available',    updatedAt:'15 Feb 2025' },
  { id:15, name:'Meja Buffet Putih',                      sku:'MBP-015', category:'Furniture',  unit:'unit',  warehouse:'Gudang Surabaya',  totalStock:8,   stockStatus:'Low Stock',    updatedAt:'-' },
  { id:16, name:'Pita Emas Roll',                         sku:'PER-016', category:'Decoration', unit:'roll',  warehouse:'Gudang Bali 66',   totalStock:100, stockStatus:'Available',    updatedAt:'-' },
  { id:17, name:'Taplak Meja Putih 2x1m',                 sku:'TMP-017', category:'Fabric',     unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:30,  stockStatus:'Available',    updatedAt:'10 Feb 2025' },
  { id:18, name:'Tealight Holder Lama Tinggi 15cm',       sku:'THL-018', category:'Decoration', unit:'pcs',   warehouse:'Gudang Bali 70',   totalStock:27,  stockStatus:'Available',    updatedAt:'-' },
  { id:19, name:'Tripod Kamera Mini',                     sku:'TKM-019', category:'Equipment',  unit:'unit',  warehouse:'Gudang Cililitan', totalStock:5,   stockStatus:'Low Stock',    updatedAt:'-' },
  { id:20, name:'Vase Keramik Putih Tinggi',              sku:'VKP-020', category:'Decoration', unit:'pcs',   warehouse:'Gudang Bali 66',   totalStock:15,  stockStatus:'Available',    updatedAt:'-' },
  { id:21, name:'Acrylic Ball Silver 20cm',               sku:'ABS-021', category:'Decoration', unit:'pcs',   warehouse:'Gudang Bali 70',   totalStock:189, stockStatus:'Available',    updatedAt:'-' },
  { id:22, name:'Kain Putih Polos 6m',                    sku:'KPP-022', category:'Fabric',     unit:'meter', warehouse:'Gudang Bali 70',   totalStock:1,   stockStatus:'Out of Stock', updatedAt:'-' },
];

const categories    = ['Floral','Furniture','Lighting','Fabric','Decoration','Equipment'];
const stockStatuses = ['Available','Low Stock','Out of Stock'];

function stockBadge(s) {
  if (s === 'Available')    return <span className="badge badge-green">{s}</span>;
  if (s === 'Low Stock')    return <span className="badge badge-orange">{s}</span>;
  if (s === 'Out of Stock') return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-gray">{s}</span>;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const [query,       setQuery]       = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page,        setPage]        = useState(1);
  const [sortCol,     setSortCol]     = useState(0);
  const [sortAsc,     setSortAsc]     = useState(true);
  const [imgPopup,    setImgPopup]    = useState({ open:false, name:'', src:null });

  const sortKeys = ['name','sku','category','unit','warehouse','totalStock','stockStatus','updatedAt'];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const key = sortKeys[sortCol] || 'name';
    return inventoryData
      .filter(r => {
        const mQ = !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
        const mC = !catFilter   || r.category    === catFilter;
        const mS = !stockFilter || r.stockStatus === stockFilter;
        return mQ && mC && mS;
      })
      .sort((a, b) => {
        const va = String(a[key] ?? ''), vb = String(b[key] ?? '');
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
  }, [query, catFilter, stockFilter, sortCol, sortAsc]);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const availableCount  = inventoryData.filter(r => r.stockStatus === 'Available').length;
  const lowStockCount   = inventoryData.filter(r => r.stockStatus === 'Low Stock').length;
  const outOfStockCount = inventoryData.filter(r => r.stockStatus === 'Out of Stock').length;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Inventory</h1>
        <button className="btn-new"><IconPlus /> New Item</button>
      </div>

      {/* Stats */}
      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        {[
          { label:'Total Items',  value:inventoryData.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Available',    value:availableCount,        color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Low Stock',    value:lowStockCount,         color:'var(--orange)', bg:'var(--orange-bg)' },
          { label:'Out of Stock', value:outOfStockCount,       color:'var(--red)',    bg:'var(--red-bg)' },
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
                className="search-input" type="text" placeholder="Search name or SKU…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="wi-select-wrap">
              <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {stockStatuses.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn-search">Search</button>
          </div>
          <div className="toolbar-right">
            <button className="btn-new"><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name"         colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="SKU"          colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90 }} />
                <SortTh label="Category"     colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:105 }} />
                <SortTh label="Unit"         colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:70 }} />
                <SortTh label="Warehouse"    colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:120 }} />
                <SortTh label="Total Stock"  colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90, textAlign:'right' }} />
                <SortTh label="Status"       colIndex={6} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:110 }} />
                <SortTh label="Updated At"   colIndex={7} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:100 }} />
                <th style={{ width:60, textAlign:'center' }}>Image</th>
                <th style={{ width:80, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={10} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No results found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td className="id-cell">{r.sku}</td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize:'10.5px' }}>{r.category}</span>
                    </td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.unit}</td>
                    <td>{r.warehouse}</td>
                    <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600 }}>{r.totalStock}</td>
                    <td>{stockBadge(r.stockStatus)}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.updatedAt === '-' ? '—' : r.updatedAt}</td>
                    <td style={{ textAlign:'center' }}>
                      <ImgCell
                        src={r.image || null}
                        name={r.name}
                        onClick={() => setImgPopup({ open:true, name:r.name, src:r.image || null })}
                      />
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent:'center' }}>
                        <button className="btn-icon" title="View Detail" style={{ color:'var(--brand)' }} onClick={() => navigate(`/inventory-detail?id=${r.id}`)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="btn-icon edit"   title="Edit"><IconEdit /></button>
                        <button className="btn-icon delete" title="Delete"><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} label="items" />
      </div>

      <ImageViewerModal
        open={imgPopup.open}
        name={imgPopup.name}
        src={imgPopup.src}
        onClose={() => setImgPopup(p => ({ ...p, open:false }))}
      />
    </>
  );
}
