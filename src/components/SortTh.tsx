import { IconSortUp, IconSortDown } from './icons.js';

export default function SortTh({ label, colIndex, sortCol, sortAsc, onSort, style, id }: any) {
  return (
    <th className="sortable" onClick={() => onSort(id ? id : colIndex)} style={style}>
      {label}{' '}
      <span className="sort-icon">
        <IconSortUp />
        <IconSortDown />
      </span>
    </th>
  );
}
