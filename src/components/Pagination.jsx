import { IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight } from './icons';

function visiblePages(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', cur - 1, cur, cur + 1, '...', total];
}

export default function Pagination({ currentPage, total, pageSize, onPage, label }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pages = visiblePages(currentPage, totalPages);

  if (total === 0) return null;

  return (
    <div className="pagination-wrap">
      <button className="pg-btn" onClick={() => onPage(1)} disabled={currentPage === 1}><IconChevronsLeft /></button>
      <button className="pg-btn" onClick={() => onPage(currentPage - 1)} disabled={currentPage === 1}><IconChevronLeft /></button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={i} className="pg-btn" style={{ cursor: 'default' }}>…</span>
          : <button key={p} className={`pg-btn${p === currentPage ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      )}
      <button className="pg-btn" onClick={() => onPage(currentPage + 1)} disabled={currentPage === totalPages}><IconChevronRight /></button>
      <button className="pg-btn" onClick={() => onPage(totalPages)} disabled={currentPage === totalPages}><IconChevronsRight /></button>
      <span className="pagination-info">{from} to {to} of {total} {label || 'items'}</span>
    </div>
  );
}
