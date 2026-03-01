import React from 'react';

export type PaginatorProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
};

export const Paginator: React.FC<PaginatorProps> = ({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50] }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  function changeSize(size: number) {
    onPageSizeChange?.(size);
    onPageChange(1); // reset to first page on size change
  }

  return (
    <div className="paginator" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button className="icon-btn" onClick={() => canPrev && onPageChange(page - 1)} disabled={!canPrev} aria-label="Pagina precedente">←</button>
        <span>Pagina {page} di {totalPages}</span>
        <button className="icon-btn" onClick={() => canNext && onPageChange(page + 1)} disabled={!canNext} aria-label="Pagina successiva">→</button>
      </div>
      {onPageSizeChange && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>Per pagina:</span>
          <select value={pageSize} onChange={(e) => changeSize(Number(e.target.value))}>
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};
