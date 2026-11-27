import { IconSortUp, IconSortDown } from './icons';

// Sortable column header. The active column shows one arrow in the brand colour (↑ ascending, ↓ descending);
// other columns show both arrows faded. Keyboard: Enter/Space sorts (UX review 2026-11-27).
export default function SortTh({ label, colIndex, sortCol, sortAsc, onSort, style, id, className }: any) {
  const key = id ? id : colIndex;
  const active = sortCol !== undefined && sortCol !== null && sortCol === key;
  const dir = active ? (sortAsc ? 'ascending' : 'descending') : 'none';
  return (
    <th
      className={`sortable${active ? ' sorted' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onSort(key)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort(key); } }}
      tabIndex={0}
      aria-sort={dir}
      style={style}
    >
      {label}{' '}
      <span className={`sort-icon ${active ? (sortAsc ? 'is-asc' : 'is-desc') : 'is-none'}`} aria-hidden="true">
        <IconSortUp />
        <IconSortDown />
      </span>
    </th>
  );
}
