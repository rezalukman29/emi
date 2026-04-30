import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete } from '../components/icons';

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
  const [query,       setQuery]       = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page,        setPage]        = useState(1);
  const [sortCol,     setSortCol]     = useState(0);
  const [sortAsc,     setSortAsc]     = useState(true);

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
                <th style={{ width:80, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No results found.</td></tr>
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
                    <td>
                      <div className="action-btns" style={{ justifyContent:'center' }}>
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
    </>
  );
}
