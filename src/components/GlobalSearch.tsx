import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch, IconClose } from './icons';
import { initialEvents } from '../data/events';
import { inventoryData } from '../data/inventory';
import { initialWarehouses } from '../data/warehouses';
import { wiData } from '../data/warehouseInventory';
import { initialAreas } from '../data/areas';
import { initialCategories } from '../data/categories';
import { initialUnits } from '../data/units';
import { initialItemLoans } from '../data/itemLoans';

const MAX_PER_GROUP = 5;

interface SearchItem { label: string; sub?: string; to: string }
interface SearchGroup { type: string; items: SearchItem[] }

function search(query: string): SearchGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const groups: SearchGroup[] = [];

  const events = initialEvents
    .filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(e => ({ label: e.name, sub: `${e.code} · ${e.location}`, to: `/event-detail?name=${encodeURIComponent(e.name)}` }));
  if (events.length) groups.push({ type: 'Event', items: events });

  const inventory = inventoryData
    .filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(i => ({ label: i.name, sub: `${i.sku} · ${i.category} · ${i.warehouse}`, to: '/inventory' }));
  if (inventory.length) groups.push({ type: 'Inventory', items: inventory });

  const warehouses = initialWarehouses
    .filter(w => w.name.toLowerCase().includes(q) || (w.location || '').toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(w => ({ label: w.name, sub: w.location, to: '/warehouse' }));
  if (warehouses.length) groups.push({ type: 'Warehouse', items: warehouses });

  const warehouseInventory = wiData
    .filter(r => r.name.toLowerCase().includes(q) || r.warehouseName.toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(r => ({ label: r.name, sub: `${r.warehouseName} · Stock ${r.itemStock}`, to: '/warehouse-inventory' }));
  if (warehouseInventory.length) groups.push({ type: 'Warehouse Inventory', items: warehouseInventory });

  const areas = initialAreas
    .filter(a => a.name.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(a => ({ label: a.name, sub: a.desc, to: '/area' }));
  if (areas.length) groups.push({ type: 'Area', items: areas });

  const categories = initialCategories
    .filter(c => c.name.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(c => ({ label: c.name, sub: c.desc, to: '/category' }));
  if (categories.length) groups.push({ type: 'Category', items: categories });

  const units = initialUnits
    .filter(u => u.name.toLowerCase().includes(q) || u.abbr.toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(u => ({ label: u.name, sub: u.abbr, to: '/unit' }));
  if (units.length) groups.push({ type: 'Unit', items: units });

  const loans = initialItemLoans
    .filter(l => l.itemName.toLowerCase().includes(q) || l.borrowerName.toLowerCase().includes(q))
    .slice(0, MAX_PER_GROUP)
    .map(l => ({ label: l.itemName, sub: `Loaned to ${l.borrowerName}`, to: '/item-loan' }));
  if (loans.length) groups.push({ type: 'Item Loan', items: loans });

  return groups;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => search(query), [query]);
  const totalCount = groups.reduce((s, g) => s + g.items.length, 0);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function goTo(to: string) {
    navigate(to);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="global-search" ref={wrapRef}>
      <div className="global-search-input-wrap">
        <IconSearch />
        <input
          type="text"
          placeholder="Search events, items, warehouses…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        />
        {query && (
          <button className="global-search-clear" onClick={() => { setQuery(''); setOpen(false); }}>
            <IconClose />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="global-search-dropdown">
          {totalCount === 0
            ? <div className="global-search-empty">No results for &ldquo;{query}&rdquo;</div>
            : groups.map(g => (
              <div key={g.type} className="global-search-group">
                <div className="global-search-group-label">{g.type}</div>
                {g.items.map((item, i) => (
                  <button key={i} className="global-search-item" onClick={() => goTo(item.to)}>
                    <span className="global-search-item-label">{item.label}</span>
                    {item.sub && <span className="global-search-item-sub">{item.sub}</span>}
                  </button>
                ))}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
