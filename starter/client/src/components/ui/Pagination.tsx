import React from "react";
import { Button } from "./Button";

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange }) => {
  const currentPage = Math.max(1, meta.current_page);
  const lastPage = Math.max(1, meta.last_page);
  const start = meta.total === 0 ? 0 : (currentPage - 1) * meta.per_page + 1;
  const end = Math.min(currentPage * meta.per_page, meta.total);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-muted bg-bg-light px-5 py-4 shadow sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Showing {start}-{end} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          iconName="FaChevronLeft"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        />
        <span className="px-3 text-xs font-black uppercase italic tracking-widest text-text">
          {currentPage} / {lastPage}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          iconName="FaChevronRight"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        />
      </div>
    </div>
  );
};

export default Pagination;
