import { IconSortUp, IconSortDown } from './icons';

export default function SortTh({ label, colIndex, sortCol, sortAsc, onSort, style }) {
  return (
    <th className="sortable" onClick={() => onSort(colIndex)} style={style}>
      {label}{' '}
      <span className="sort-icon">
        <IconSortUp />
        <IconSortDown />
      </span>
    </th>
  );
}
