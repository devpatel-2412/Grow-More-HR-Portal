import { useMemo, useState, useEffect, type ComponentType } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Columns3, Download } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table';
import { Checkbox } from './checkbox';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { toCsv, downloadCsv } from '../../utils/csv-export';
import { cn } from '../../utils/cn';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Plain-text value for CSV export. Omit for columns that render actions/buttons — they're skipped in the export. */
  csvValue?: (row: T) => string;
  className?: string;
  /** A column with `alwaysVisible` cannot be hidden via the column-visibility menu (e.g. the primary identifying column). */
  alwaysVisible?: boolean;
}

export interface DataTableBulkAction<T> {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onAction: (selectedRows: T[]) => void;
  variant?: 'default' | 'ghost' | 'destructive';
}

export interface DataTableProps<T> {
  /** Unique per usage — becomes the localStorage key for column visibility, so keep it stable and distinct per table. */
  tableId: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
  selectable?: boolean;
  bulkActions?: DataTableBulkAction<T>[];
  /** Presence enables the "Export CSV" button, exporting the currently loaded/visible rows and columns. */
  exportFilename?: string;
  defaultHiddenColumnIds?: string[];
  /** Opt-in: renders a stacked card per row below `sm` instead of the table (which otherwise falls back to horizontal scroll — still accessible, just not this). */
  mobileCard?: (row: T) => React.ReactNode;
}

function nextSort(columnId: string, current: string | undefined): string | undefined {
  if (current === `${columnId}:asc`) return `${columnId}:desc`;
  if (current === `${columnId}:desc`) return undefined;
  return `${columnId}:asc`;
}

export function DataTable<T>({
  tableId,
  columns,
  rows,
  getRowId,
  sort,
  onSortChange,
  selectable = false,
  bulkActions = [],
  exportFilename,
  defaultHiddenColumnIds = [],
  mobileCard,
}: DataTableProps<T>) {
  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);
  const { isVisible, toggle } = useColumnVisibility(tableId, columnIds, defaultHiddenColumnIds);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rowIdsKey = rows.map(getRowId).join(',');
  useEffect(() => {
    setSelected(new Set());
  }, [rowIdsKey]);

  const visibleColumns = columns.filter((c) => c.alwaysVisible || isVisible(c.id));
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(getRowId)));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    if (!exportFilename) return;
    const exportable = visibleColumns.filter((c) => c.csvValue);
    const headers = exportable.map((c) => c.header);
    const csvRows = rows.map((row) => exportable.map((c) => c.csvValue!(row)));
    downloadCsv(exportFilename, toCsv(headers, csvRows));
  }

  const selectedRows = rows.filter((row) => selected.has(getRowId(row)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-h-8 flex-1 items-center gap-2">
          {selectable && selectedRows.length > 0 && (
            <>
              <span className="text-xs font-medium text-[var(--muted-foreground)]">{selectedRows.length} selected</span>
              {bulkActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.variant === 'destructive' ? 'destructive' : action.variant === 'default' ? 'default' : 'outline'}
                  onClick={() => action.onAction(selectedRows)}
                >
                  {action.icon && <action.icon className="h-3.5 w-3.5" />}
                  {action.label}
                </Button>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {exportFilename && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label="Toggle column visibility">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((c) => !c.alwaysVisible)
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={isVisible(column.id)}
                    onCheckedChange={() => toggle(column.id)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={mobileCard ? 'hidden sm:block' : undefined}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[var(--card)]">
            <TableRow>
              {selectable && (
                <TableHead className="w-8">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {visibleColumns.map((column) => {
                const active = sort?.startsWith(`${column.id}:`);
                const direction = sort === `${column.id}:asc` ? 'asc' : sort === `${column.id}:desc` ? 'desc' : undefined;
                return (
                  <TableHead key={column.id} className={column.className}>
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(nextSort(column.id, sort))}
                        className={cn(
                          'flex items-center gap-1 uppercase tracking-widest hover:text-[var(--foreground)]',
                          active && 'text-[var(--foreground)]',
                        )}
                      >
                        {column.header}
                        {direction === 'asc' && <ArrowUp className="h-3 w-3" />}
                        {direction === 'desc' && <ArrowDown className="h-3 w-3" />}
                        {!direction && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow key={id}>
                  {selectable && (
                    <TableCell>
                      <Checkbox checked={selected.has(id)} onCheckedChange={() => toggleRow(id)} aria-label="Select row" />
                    </TableCell>
                  )}
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {mobileCard && (
        <div className="space-y-2 sm:hidden">
          {rows.map((row) => {
            const id = getRowId(row);
            return (
              <div key={id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3">
                {selectable && (
                  <Checkbox checked={selected.has(id)} onCheckedChange={() => toggleRow(id)} aria-label="Select row" className="mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">{mobileCard(row)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
