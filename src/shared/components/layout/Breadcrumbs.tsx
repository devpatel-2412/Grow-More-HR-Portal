import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/** Purely presentational — fed by data the caller already has in hand, never by route metadata. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />}
            {item.to && !isLast ? (
              <Link to={item.to} className="truncate hover:text-[var(--foreground)] hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'truncate font-medium text-[var(--foreground)]' : 'truncate'} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
