import { Link } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/data-table';
import { SopStatusBadge } from './SopStatusBadge';
import type { SopRecord } from '../types/sop.types';

export function SopTable({
  sops,
  sort,
  onSortChange,
}: {
  sops: SopRecord[];
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
}) {
  const columns: DataTableColumn<SopRecord>[] = [
    {
      id: 'title',
      header: 'Title',
      sortable: true,
      alwaysVisible: true,
      csvValue: (s) => s.title,
      cell: (s) => (
        <Link to={`/sops/${s.id}`} className="font-semibold hover:underline">
          {s.title}
        </Link>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      csvValue: (s) => s.category ?? '',
      cell: (s) => s.category ?? '—',
    },
    {
      id: 'department',
      header: 'Department',
      csvValue: (s) => s.department ?? '',
      cell: (s) => s.department ?? '—',
    },
    {
      id: 'version',
      header: 'Version',
      sortable: true,
      csvValue: (s) => `v${s.version}`,
      cell: (s) => `v${s.version}`,
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      csvValue: (s) => s.status,
      cell: (s) => <SopStatusBadge status={s.status} />,
    },
  ];

  return (
    <DataTable
      tableId="sops"
      columns={columns}
      rows={sops}
      getRowId={(s) => s.id}
      sort={sort}
      onSortChange={onSortChange}
      exportFilename="sops"
    />
  );
}
