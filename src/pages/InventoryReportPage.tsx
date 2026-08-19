import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import { IconSearch, IconPrint } from '../components/icons';
import { inventoryData, categories, stockStatuses } from '../data/inventory';

const PAGE_SIZE = 10;

interface StockBreakdown {
  count: number;
  stock: number;
}

function stockBadgeClass(status: string) {
  if (status === 'Low Stock') return 'badge-orange';
  if (status === 'Out of Stock') return 'badge-red';
  return 'badge-green';
}

export default function InventoryReportPage() {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const totalStockUnits = inventoryData.reduce((s, i) => s + i.totalStock, 0);
  const lowStockCount = inventoryData.filter(i => i.stockStatus === 'Low Stock').length;
  const outOfStockCount = inventoryData.filter(i => i.stockStatus === 'Out of Stock').length;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, StockBreakdown> = {};
    inventoryData.forEach(i => {
      if (!map[i.category]) map[i.category] = { count: 0, stock: 0 };
      map[i.category].count += 1;
      map[i.category].stock += i.totalStock;
    });
    return Object.entries(map).sort((a, b) => b[1].stock - a[1].stock);
  }, []);
  const maxCategoryStock = Math.max(...categoryBreakdown.map(([, v]) => v.stock), 1);

  const warehouseBreakdown = useMemo(() => {
    const map: Record<string, StockBreakdown> = {};
    inventoryData.forEach(i => {
      if (!map[i.warehouse]) map[i.warehouse] = { count: 0, stock: 0 };
      map[i.warehouse].count += 1;
      map[i.warehouse].stock += i.totalStock;
    });
    return Object.entries(map).sort((a, b) => b[1].stock - a[1].stock);
  }, []);
  const maxWarehouseStock = Math.max(...warehouseBreakdown.map(([, v]) => v.stock), 1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventoryData.filter(i =>
      (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) &&
      (!categoryFilter || i.category === categoryFilter) &&
      (!statusFilter || i.stockStatus === statusFilter)
    );
  }, [query, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Inventory Report</h1>
        <button className="btn-print" onClick={() => window.print()}><IconPrint /> Print Report</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total SKU</div>
          <div className="kpi-value">{inventoryData.length}</div>
          <div className="kpi-sub">registered item types</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Total Stock</div>
          <div className="kpi-value">{totalStockUnits.toLocaleString('id-ID')}</div>
          <div className="kpi-sub">units across all warehouses</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Low Stock</div>
          <div className="kpi-value">{lowStockCount}</div>
          <div className="kpi-sub">need immediate restocking</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Out of Stock</div>
          <div className="kpi-value">{outOfStockCount}</div>
          <div className="kpi-sub">completely out of stock</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
        <div className="card">
          <div className="section-title">Stock by Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categoryBreakdown.map(([category, v]) => (
              <div key={category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{category} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({v.count} SKU)</span></span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{v.stock.toLocaleString('id-ID')}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${(v.stock / maxCategoryStock) * 100}%`, background: 'var(--brand)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Stock by Warehouse</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {warehouseBreakdown.map(([warehouse, v]) => (
              <div key={warehouse}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{warehouse} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({v.count} SKU)</span></span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{v.stock.toLocaleString('id-ID')}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${(v.stock / maxWarehouseStock) * 100}%`, background: 'var(--green)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
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
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="wi-select-wrap">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                {stockStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th style={{ width: 90 }}>SKU</th>
                <th style={{ width: 110 }}>Category</th>
                <th style={{ width: 70 }}>Unit</th>
                <th>Warehouse</th>
                <th style={{ width: 80, textAlign: 'right' }}>Stock</th>
                <th style={{ width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No items found.</td></tr>
                : pageData.map(i => (
                  <tr key={i.id}>
                    <td className="name-cell">{i.name}</td>
                    <td className="id-cell" style={{ fontFamily: 'monospace' }}>{i.sku}</td>
                    <td>{i.category}</td>
                    <td>{i.unit}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{i.warehouse}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.totalStock}</td>
                    <td><span className={`badge ${stockBadgeClass(i.stockStatus)}`}>{i.stockStatus}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="items" />
      </div>
    </>
  );
}
