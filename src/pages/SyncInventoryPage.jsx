import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch } from '../components/icons';

const PAGE_SIZE = 10;

const syncData = [
  { id:1,  name:'Artificial Flower Chrysant Giant White', sku:'AFG-001', stock:342, warehouseStock:340, warehouse:'Gudang Bali 66'   },
  { id:2,  name:'Artificial Flower Lunaria White',        sku:'AFL-002', stock:327, warehouseStock:277, warehouse:'Gudang Bali 66'   },
  { id:3,  name:'Artificial Rose Pink',                   sku:'ARP-003', stock:182, warehouseStock:182, warehouse:'Gudang Bali 66'   },
  { id:4,  name:'Backdrop Stand 2m',                      sku:'BSD-004', stock:8,   warehouseStock:10,  warehouse:'Gudang C9'        },
  { id:5,  name:'Balon Latex Putih',                      sku:'BLP-005', stock:500, warehouseStock:500, warehouse:'Gudang Surabaya'  },
  { id:6,  name:'Candle Holder Bulat Besar',              sku:'CHB-006', stock:60,  warehouseStock:58,  warehouse:'Gudang Bali 70'   },
  { id:7,  name:'Crystal Bentuk Tabung',                  sku:'CBT-007', stock:100, warehouseStock:100, warehouse:'Gudang Bali 66'   },
  { id:8,  name:'Fabric Putih Polos 3m',                  sku:'FPP-008', stock:20,  warehouseStock:24,  warehouse:'Gudang Cililitan' },
  { id:9,  name:'Flower Arch Besi 60cm',                  sku:'FAB-009', stock:12,  warehouseStock:12,  warehouse:'Gudang Bali 70'   },
  { id:10, name:'Gebyok Jati Ukiran',                     sku:'GJU-010', stock:2,   warehouseStock:3,   warehouse:'Gudang Cililitan' },
  { id:11, name:'Janur Kuning',                           sku:'JKN-011', stock:50,  warehouseStock:50,  warehouse:'Gudang Bali 66'   },
  { id:12, name:'Kain Batik Wahyu Tumurun',               sku:'KBW-012', stock:80,  warehouseStock:80,  warehouse:'Gudang Cililitan' },
  { id:13, name:'Kursi Tiffany Putih',                    sku:'KTP-013', stock:80,  warehouseStock:75,  warehouse:'Gudang Bali 66'   },
  { id:14, name:'Lilin Merah Besar',                      sku:'LMB-014', stock:50,  warehouseStock:50,  warehouse:'Gudang Bali 66'   },
  { id:15, name:'Meja Buffet Putih',                      sku:'MBP-015', stock:8,   warehouseStock:9,   warehouse:'Gudang Surabaya'  },
  { id:16, name:'Pita Emas Roll',                         sku:'PER-016', stock:100, warehouseStock:100, warehouse:'Gudang Bali 66'   },
  { id:17, name:'Taplak Meja Putih 2x1m',                 sku:'TMP-017', stock:30,  warehouseStock:30,  warehouse:'Gudang Bali 66'   },
  { id:18, name:'Tealight Holder Lama Tinggi 15cm',       sku:'THL-018', stock:27,  warehouseStock:22,  warehouse:'Gudang Bali 70'   },
  { id:19, name:'Tripod Kamera Mini',                     sku:'TKM-019', stock:5,   warehouseStock:5,   warehouse:'Gudang Cililitan' },
  { id:20, name:'Vase Keramik Putih Tinggi',              sku:'VKP-020', stock:15,  warehouseStock:15,  warehouse:'Gudang Bali 66'   },
];

function DiffBadge({ diff }) {
  if (diff === 0) return <span className="badge badge-green" style={{ fontSize:'11px' }}>Match</span>;
  if (diff > 0)  return <span className="badge badge-orange" style={{ fontSize:'11px' }}>+{diff}</span>;
  return <span className="badge badge-red" style={{ fontSize:'11px' }}>{diff}</span>;
}

export default function SyncInventoryPage() {
  const [query,           setQuery]           = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [diffFilter,      setDiffFilter]      = useState('');
  const [page,            setPage]            = useState(1);
  const [sortCol,         setSortCol]         = useState(-1);
  const [sortAsc,         setSortAsc]         = useState(true);
  const [syncing,         setSyncing]         = useState({});

  const warehouseNames = useMemo(() => [...new Set(syncData.map(r => r.warehouse))].sort(), []);
  const sortKeys = ['name','sku','stock','warehouseStock','warehouse'];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let data = syncData.filter(r => {
      const diff = r.stock - r.warehouseStock;
      const mQ = !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
      const mW = !warehouseFilter || r.warehouse === warehouseFilter;
      const mD = diffFilter === '' ||
                 (diffFilter === 'match' && diff === 0) ||
                 (diffFilter === 'diff'  && diff !== 0);
      return mQ && mW && mD;
    });
    if (sortCol >= 0) {
      const key = sortKeys[sortCol] || 'name';
      data.sort((a, b) => {
        const va = String(a[key] ?? ''), vb = String(b[key] ?? '');
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
    }
    return data;
  }, [query, warehouseFilter, diffFilter, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function doSync(id) {
    setSyncing(s => ({ ...s, [id]: true }));
    setTimeout(() => setSyncing(s => { const n = { ...s }; delete n[id]; return n; }), 1800);
  }

  const matchCount = syncData.filter(r => r.stock === r.warehouseStock).length;
  const diffCount  = syncData.length - matchCount;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Syncronize Inventory</h1>
        <button className="btn-new" onClick={() => syncData.forEach(r => doSync(r.id))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}>
            <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          Sync All
        </button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        {[
          { label:'Total Items',   value:syncData.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Matched',       value:matchCount,       color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Discrepancy',   value:diffCount,        color:'var(--red)',    bg:'var(--red-bg)' },
          { label:'Showing',       value:filtered.length,  color:'var(--purple)', bg:'var(--purple-bg)' },
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
                className="search-input" type="text" placeholder="Search item or SKU…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="wi-select-wrap">
              <select value={warehouseFilter} onChange={e => { setWarehouseFilter(e.target.value); setPage(1); }}>
                <option value="">All Warehouses</option>
                {warehouseNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="wi-select-wrap">
              <select value={diffFilter} onChange={e => { setDiffFilter(e.target.value); setPage(1); }}>
                <option value="">All Items</option>
                <option value="match">Matched</option>
                <option value="diff">Discrepancy</option>
              </select>
            </div>
            <button className="btn-search">Search</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name"            colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="SKU"             colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90 }} />
                <SortTh label="Stock"           colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:75, textAlign:'right' }} />
                <SortTh label="Warehouse Stock" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:130, textAlign:'right' }} />
                <SortTh label="Warehouse"       colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:130 }} />
                <th style={{ width:100 }}>Detail</th>
                <th style={{ width:95, textAlign:'center' }}>Sync</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No results found.</td></tr>
                : pageData.map(r => {
                    const diff     = r.stock - r.warehouseStock;
                    const isSynced = !!syncing[r.id];
                    return (
                      <tr key={r.id}>
                        <td className="name-cell">{r.name}</td>
                        <td className="id-cell">{r.sku}</td>
                        <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600 }}>{r.stock}</td>
                        <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.warehouseStock}</td>
                        <td style={{ fontSize:'12.5px' }}>{r.warehouse}</td>
                        <td><DiffBadge diff={diff} /></td>
                        <td style={{ textAlign:'center' }}>
                          <button
                            onClick={() => doSync(r.id)}
                            disabled={isSynced}
                            style={{
                              display:'inline-flex', alignItems:'center', gap:5,
                              padding:'5px 12px',
                              background: isSynced ? 'var(--green-bg)' : 'var(--brand-bg)',
                              color: isSynced ? 'var(--green)' : 'var(--brand)',
                              border: `1px solid ${isSynced ? 'var(--green)' : 'var(--brand)'}`,
                              borderRadius:'var(--r)', fontSize:'12px', fontWeight:600,
                              cursor: isSynced ? 'default' : 'pointer', fontFamily:'inherit',
                              transition:'all .15s', opacity: isSynced ? .75 : 1,
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width:12, height:12 }}>
                              {isSynced
                                ? <polyline points="20 6 9 17 4 12"/>
                                : <><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></>
                              }
                            </svg>
                            {isSynced ? 'Synced' : 'Sync'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} label="items" />
      </div>
    </>
  );
}
