import { useMemo, useState } from 'react';
import { useDebounce } from './useDebounce';

export interface PaginationState {
  page: number;
  limit: number;
  search: string;
  sort?: string;
}

export interface PaginationControls extends PaginationState {
  debouncedSearch: string;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setSort: (sort: string | undefined) => void;
  /** Merged into the query object passed straight to a TanStack Query hook. */
  queryParams: { page: number; limit: number; search?: string; sort?: string };
}

/** Shared list-screen state: page/limit/search/sort, with search debounced and page reset on search change. */
export function usePagination(initialLimit = 20): PaginationControls {
  const [page, setPageState] = useState(1);
  const [search, setSearchState] = useState('');
  const [sort, setSort] = useState<string | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 300);

  function setSearch(value: string) {
    setSearchState(value);
    setPageState(1);
  }

  function setPage(value: number) {
    setPageState(value);
  }

  const queryParams = useMemo(
    () => ({
      page,
      limit: initialLimit,
      search: debouncedSearch || undefined,
      sort,
    }),
    [page, initialLimit, debouncedSearch, sort],
  );

  return { page, limit: initialLimit, search, sort, debouncedSearch, setPage, setSearch, setSort, queryParams };
}
