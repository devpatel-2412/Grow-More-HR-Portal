import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import type { PaginationMeta } from '../../types/pagination.types';

interface PaginationBarProps {
  meta: Pick<PaginationMeta, 'page' | 'totalPages' | 'total'>;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ meta, onPageChange }: PaginationBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
      <span>
        Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
