import { IconSortUp, IconSortDown } from './icons';

export default function SortTh({ label, colIndex, sortCol, sortAsc, onSort, style, id }) {
  return (
    <th className="sortable" onClick={() => onSort(id)} style={style}>
      {label}{' '}
      <span className="sort-icon">
        <IconSortUp />
        <IconSortDown />
      </span>
    </th>
  );
}
