import { IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight } from './icons';
import { useTranslation } from 'react-i18next';
import { PAGE_SIZE_OPTIONS, isPageSizeAdjustable, setPageSize } from '../lib/pageSize';

function visiblePages(cur: any, total: any) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', cur - 1, cur, cur + 1, '...', total];
}

export default function Pagination({ currentPage: rawPage, total: rawTotal, pageSize, onPage, label }: any) {
  const { t } = useTranslation();
  // Data may still be loading (undefined total) — never render NaN page buttons (UX review 2026-11-26).
  const total = Number(rawTotal) || 0;
  const currentPage = Math.max(1, Number(rawPage) || 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pages = visiblePages(currentPage, totalPages);

  if (total === 0) return null;
  const adjustable = isPageSizeAdjustable();
  const sizeOptions = PAGE_SIZE_OPTIONS.includes(pageSize) ? PAGE_SIZE_OPTIONS : [...PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b);

  return (
    <div className="pagination-wrap">
      <button className="pg-btn pg-edge" aria-label={t('pagination.firstPage')} onClick={() => onPage(1)} disabled={currentPage === 1}><IconChevronsLeft /></button>
      <button className="pg-btn pg-step" aria-label={t('pagination.previousPage')} onClick={() => onPage(currentPage - 1)} disabled={currentPage === 1}><IconChevronLeft /><span className="pg-step-label">{t('pagination.prev')}</span></button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`gap-${i}`} className="pg-btn" style={{ cursor: 'default' }}>…</span>
          : <button key={`p-${p}`} className={`pg-btn${p === currentPage ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      )}
      <button className="pg-btn pg-step" aria-label={t('pagination.nextPage')} onClick={() => onPage(currentPage + 1)} disabled={currentPage === totalPages}><span className="pg-step-label">{t('pagination.next')}</span><IconChevronRight /></button>
      <button className="pg-btn pg-edge" aria-label={t('pagination.lastPage')} onClick={() => onPage(totalPages)} disabled={currentPage === totalPages}><IconChevronsRight /></button>
      {adjustable && (
        <label className="pg-size">
          <span>{t('pagination.show')}</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); onPage(1); }} aria-label={t('pagination.rowsPerPage')}>
            {sizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
      <span className="pagination-info">
        {t('pagination.summary', {
          from,
          to,
          total,
          label: label || t('pagination.items'),
        })}
      </span>
    </div>
  );
}
