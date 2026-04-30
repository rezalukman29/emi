import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { IconSearch, IconPlus, IconDelete, IconClose, IconCheck, IconCart, IconPrint, IconBarChart } from '../components/icons';

const AREAS = ['ENTRANCE','RECEPTION','CEREMONY','PHOTOBOOTH','GUEST TABLE'];
const STATUSES = ['Preparation','During Event','After Event'];

const AREA_BADGE_CLASS = {
  CEREMONY: 'ceremony', PHOTOBOOTH: 'photobooth', RECEPTION: 'reception',
  ENTRANCE: 'entrance', 'GUEST TABLE': 'guest',
};

const initialItems = [
  { id:1, name:'Chiffon White 4-6×1,2m', area:'CEREMONY',    status:'Preparation',  qty:2,  pic:'Anto',    checking:true,  warehouseItem:false, scanIn:'May 26, 2025 10:42 PM', scanOut:'May 26, 2025 9:33 PM',  note:"Please take care this item, it's luxury item" },
  { id:2, name:'hanging rotan 1',         area:'PHOTOBOOTH',  status:'Preparation',  qty:2,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:3, name:'hanging rotan 2',         area:'RECEPTION',   status:'Preparation',  qty:10, pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:4, name:'hanging rotan 3',         area:'RECEPTION',   status:'Preparation',  qty:10, pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:5, name:'Kain Putih 3m',           area:'ENTRANCE',    status:'Preparation',  qty:5,  pic:'Novi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:6, name:'Bunga Mawar Merah',       area:'RECEPTION',   status:'During Event', qty:30, pic:'Darmian', checking:true,  warehouseItem:false, scanIn:'Apr 9, 2026 08:00 AM',  scanOut:null,                    note:'' },
  { id:7, name:'Standing Flower Tall',    area:'ENTRANCE',    status:'Preparation',  qty:4,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:8, name:'Tealight Holder 15cm',    area:'GUEST TABLE', status:'During Event', qty:50, pic:'Anto',    checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:9, name:'Pita Emas 5m',            area:'CEREMONY',    status:'Preparation',  qty:20, pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:10,name:'Lilin Putih 30cm',        area:'GUEST TABLE', status:'Preparation',  qty:100,pic:'Novi',    checking:true,  warehouseItem:true,  scanIn:'Apr 9, 2026 07:30 AM',  scanOut:'Apr 9, 2026 09:00 AM', note:'' },
  { id:11,name:'Backdrop Floral 3×2m',    area:'PHOTOBOOTH',  status:'Preparation',  qty:1,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:12,name:'Kursi Tiffany',           area:'RECEPTION',   status:'During Event', qty:60, pic:'Darmian', checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
];

function CheckIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>;
}
function XIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="3" x2="3" y2="9"/><line x1="3" y1="3" x2="9" y2="9"/></svg>;
}
function ImagePlaceholder() {
  return (
    <div className="item-img-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="#b0b5cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

function ItemCard({ item, onScan, onDelete, onAddToCart }) {
  return (
    <div className="item-card">
      <ImagePlaceholder />
      <div className="item-body">
        <span className={`area-badge ${AREA_BADGE_CLASS[item.area] || 'ceremony'}`}>{item.area}</span>
        <div className="item-name-row">
          <span className="item-name">{item.name}</span>
          <span className="item-qty">Qty: {item.qty}</span>
        </div>
        <div className="item-pic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          {item.pic || '-'}
        </div>
        <div className="item-indicators">
          <div className="indicator-row">
            <span className={`indicator-box${item.checking ? ' checked' : ''}`}>
              {item.checking && <CheckIcon />}
            </span>
            Checking
          </div>
          <div className="indicator-row">
            <span className={`indicator-box${item.warehouseItem ? ' checked' : ''}`}>
              {item.warehouseItem && <CheckIcon />}
            </span>
            Warehouse Item
          </div>
        </div>
        <div className="scan-rows">
          <div className="scan-row">
            <span className={`scan-badge ${item.scanIn ? 'ok' : 'fail'}`}>
              {item.scanIn ? <CheckIcon /> : <XIcon />}
            </span>
            <span className="scan-label-text" style={!item.scanIn ? { color: '#9aa0b8' } : {}}>
              {item.scanIn ? `Scanned In at ${item.scanIn}` : 'Scan In'}
            </span>
          </div>
          <div className="scan-row">
            <span className={`scan-badge ${item.scanOut ? 'ok' : 'fail'}`}>
              {item.scanOut ? <CheckIcon /> : <XIcon />}
            </span>
            <span className="scan-label-text" style={!item.scanOut ? { color: '#9aa0b8' } : {}}>
              {item.scanOut ? `Scanned Out at ${item.scanOut}` : 'Scan Out'}
            </span>
          </div>
        </div>
        {item.note && <div className="item-note">{item.note}</div>}
        <div className="item-actions">
          <div className="item-actions-row">
            <button className="btn-ia-pkg" title="Packaging">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </button>
            <button className="btn-ia-scan" onClick={() => onScan(item.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h3v3M17 14h3"/></svg>
              Scan
            </button>
          </div>
          <div className="item-actions-row">
            <button className="btn-ia-del" title="Hapus" onClick={() => onDelete(item.id)}>
              <IconDelete />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventName = searchParams.get('name') || '03/06/2023 | GUNTUR + CLARISSA';

  const [items, setItems] = useState(initialItems);
  const [nextId, setNextId] = useState(13);

  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [areaDropOpen, setAreaDropOpen] = useState(false);
  const [kwSearch, setKwSearch] = useState('');

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [atcOpen, setAtcOpen] = useState(false);
  const [atcTargetId, setAtcTargetId] = useState(null);
  const [atcForm, setAtcForm] = useState({ status: 'Preparation', area: 'ENTRANCE', qty: 1, note: '' });

  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ name: '', area: 'ENTRANCE', status: 'Preparation', qty: 1 });

  const filtered = useMemo(() => items.filter(it => {
    if (selectedArea   && it.area   !== selectedArea)   return false;
    if (selectedStatus && it.status !== selectedStatus) return false;
    if (kwSearch && !it.name.toLowerCase().includes(kwSearch.toLowerCase()) && !it.area.toLowerCase().includes(kwSearch.toLowerCase())) return false;
    return true;
  }), [items, selectedArea, selectedStatus, kwSearch]);

  const areaLabel  = selectedArea   || 'All Place';
  const statusLabel = selectedStatus || 'All Status';

  function doScan(id) {
    const now = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
    setItems(is => is.map(it => {
      if (it.id !== id) return it;
      if (!it.scanIn)       return { ...it, scanIn: now };
      if (!it.scanOut)      return { ...it, scanOut: now };
      return it;
    }));
  }

  function deleteItem(id) {
    if (!window.confirm('Hapus item ini dari event?')) return;
    setItems(is => is.filter(i => i.id !== id));
  }

  function openAtcModal(id) {
    const it = items.find(i => i.id === id);
    setAtcTargetId(id);
    setAtcForm({ status: it.status, area: it.area, qty: it.qty, note: '' });
    setAtcOpen(true);
  }

  function confirmAddToCart() {
    const it = items.find(i => i.id === atcTargetId);
    setCart(c => {
      const existing = c.find(x => x.itemId === atcTargetId && x.status === atcForm.status && x.area === atcForm.area);
      if (existing) return c.map(x => x === existing ? { ...x, qty: x.qty + atcForm.qty } : x);
      return [...c, { itemId: atcTargetId, name: it.name, status: atcForm.status, area: atcForm.area, qty: atcForm.qty, note: atcForm.note }];
    });
    setAtcOpen(false);
  }

  function removeCartItem(idx) {
    setCart(c => c.filter((_, i) => i !== idx));
  }

  function checkout() {
    setCart([]);
    setCartOpen(false);
  }

  function saveNewItem() {
    if (!newItemForm.name.trim()) return;
    setItems(is => [...is, { id: nextId, ...newItemForm, pic: '', checking: false, warehouseItem: false, scanIn: null, scanOut: null, note: '' }]);
    setNextId(n => n + 1);
    setNewItemOpen(false);
  }

  return (
    <>
      <h1 className="page-title">Event Detail</h1>
      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => navigate('/event')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6"/></svg>
            Kembali ke Event
          </button>
        </div>

        <div className="event-heading">{eventName}</div>

        <div className="filter-row">
          <div className="custom-select" style={{ flex: 1 }}>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </div>

          <div className="dropdown-wrap" style={{ flex: 1, position: 'relative', minWidth: 190 }}>
            <div className={`dropdown-trigger${areaDropOpen ? ' open' : ''}`} onClick={() => setAreaDropOpen(o => !o)}>
              <span>{areaLabel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {areaDropOpen && (
              <div className="dropdown-menu open">
                <div className={`dropdown-item${!selectedArea ? ' selected' : ''}`} onClick={() => { setSelectedArea(''); setAreaDropOpen(false); }}>All Area</div>
                {AREAS.map(a => (
                  <div key={a} className={`dropdown-item${selectedArea === a ? ' selected' : ''}`} onClick={() => { setSelectedArea(a); setAreaDropOpen(false); }}>{a}</div>
                ))}
              </div>
            )}
          </div>

          <div className="filter-row-right">
            <button className="btn btn-check" onClick={() => {}}>
              <IconSearch /> Check
            </button>
            <button className="btn" style={{ background: 'var(--purple)', color: '#fff' }} onClick={() => navigate(`/event-summary?name=${encodeURIComponent(eventName)}`)}>
              <IconBarChart /> Summary
            </button>
            <button className="btn btn-print" onClick={() => window.print()}><IconPrint /> Print</button>
          </div>
        </div>

        <div className="search-row">
          <div className="search-wrap">
            <IconSearch />
            <input className="search-input" type="text" placeholder="Keyword Search" value={kwSearch} onChange={e => setKwSearch(e.target.value)} />
          </div>
          <div className="search-row-right">
            <button className="btn btn-pkg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              Packaging
            </button>
            <button className="btn btn-cart" onClick={() => setCartOpen(true)}>
              <IconCart /> Cart ({cart.length})
            </button>
            <button className="btn-new" onClick={() => { setNewItemForm({ name: '', area: 'ENTRANCE', status: 'Preparation', qty: 1 }); setNewItemOpen(true); }}>
              <IconPlus /> New
            </button>
          </div>
        </div>

        <p className="summary-text">
          <strong>{filtered.length}</strong> pcs item untuk state <strong>&ldquo;{statusLabel}&rdquo;</strong> di Area <strong>&ldquo;{areaLabel}&rdquo;</strong>
        </p>

        {filtered.length === 0
          ? <div className="no-data">No Data</div>
          : (
            <div className="items-grid">
              {filtered.map(it => (
                <ItemCard key={it.id} item={it} onScan={doScan} onDelete={deleteItem} onAddToCart={openAtcModal} />
              ))}
            </div>
          )
        }
      </div>

      {/* Add to Cart Modal */}
      <Modal open={atcOpen} title="Tambah ke Keranjang" onClose={() => setAtcOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setAtcOpen(false)}><IconClose /> Batal</button>
            <button className="btn-add-cart" onClick={confirmAddToCart}><IconCart /> Tambah ke Keranjang</button>
          </>
        }
      >
        <div className="atc-item-name">{items.find(i => i.id === atcTargetId)?.name}</div>
        <div className="form-row">
          <div className="form-group">
            <label>Status / State</label>
            <select value={atcForm.status} onChange={e => setAtcForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Area</label>
            <select value={atcForm.area} onChange={e => setAtcForm(f => ({ ...f, area: e.target.value }))}>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Qty</label>
            <input type="number" min={1} value={atcForm.qty} onChange={e => setAtcForm(f => ({ ...f, qty: parseInt(e.target.value) || 1 }))} />
          </div>
          <div className="form-group">
            <label>Catatan</label>
            <input type="text" placeholder="Opsional" value={atcForm.note} onChange={e => setAtcForm(f => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Cart Modal */}
      <Modal open={cartOpen} title="Keranjang Event" onClose={() => setCartOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setCartOpen(false)}>Tutup</button>
            <button className="btn-checkout" onClick={checkout}><IconCheck /> Simpan ke Event</button>
          </>
        }
      >
        {cart.length === 0
          ? <div className="cart-empty">Keranjang masih kosong</div>
          : (
            <div className="cart-list">
              {cart.map((c, i) => (
                <div key={i} className="cart-item">
                  <div className="cart-item-img">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#b0b5cc" strokeWidth="1.5" style={{ width: 28, height: 28 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{c.name}</div>
                    <div className="cart-item-meta">{c.status} · {c.area}{c.note ? ` · ${c.note}` : ''}</div>
                  </div>
                  <span className="cart-item-qty">×{c.qty}</span>
                  <button className="cart-item-remove" onClick={() => removeCartItem(i)}>
                    <IconDelete />
                  </button>
                </div>
              ))}
            </div>
          )
        }
      </Modal>

      {/* New Item Modal */}
      <Modal open={newItemOpen} title="Tambah Item Baru" onClose={() => setNewItemOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setNewItemOpen(false)}>Batal</button>
            <button className="btn-add-cart" style={{ background: '#16a34a' }} onClick={saveNewItem}><IconCheck /> Simpan</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Nama Item</label>
            <input type="text" placeholder="Nama item" value={newItemForm.name} onChange={e => setNewItemForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Area</label>
            <select value={newItemForm.area} onChange={e => setNewItemForm(f => ({ ...f, area: e.target.value }))}>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={newItemForm.status} onChange={e => setNewItemForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Qty</label>
            <input type="number" min={1} value={newItemForm.qty} onChange={e => setNewItemForm(f => ({ ...f, qty: parseInt(e.target.value) || 1 }))} />
          </div>
        </div>
      </Modal>
    </>
  );
}
