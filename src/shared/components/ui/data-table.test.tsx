import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from './data-table';
import { renderWithProviders } from '../../../test/test-utils';

interface Row {
  id: string;
  name: string;
  role: string;
}

const rows: Row[] = [
  { id: '1', name: 'Ada Admin', role: 'ADMIN' },
  { id: '2', name: 'Wanda Worker', role: 'EMPLOYEE' },
];

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', sortable: true, alwaysVisible: true, csvValue: (r) => r.name, cell: (r) => r.name },
  { id: 'role', header: 'Role', csvValue: (r) => r.role, cell: (r) => r.role },
];

describe('DataTable', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders every row and column', () => {
    renderWithProviders(<DataTable tableId="t1" columns={columns} rows={rows} getRowId={(r) => r.id} />);

    expect(screen.getByText('Ada Admin')).toBeInTheDocument();
    expect(screen.getByText('Wanda Worker')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('cycles a sortable header through asc → desc → none on repeated clicks', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable tableId="t2" columns={columns} rows={rows} getRowId={(r) => r.id} sort={undefined} onSortChange={onSortChange} />,
    );

    const header = screen.getByRole('button', { name: /name/i });
    await user.click(header);
    expect(onSortChange).toHaveBeenCalledWith('name:asc');
  });

  it('moves from asc to desc when already sorted ascending', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable tableId="t3" columns={columns} rows={rows} getRowId={(r) => r.id} sort="name:asc" onSortChange={onSortChange} />,
    );

    await user.click(screen.getByRole('button', { name: /name/i }));
    expect(onSortChange).toHaveBeenCalledWith('name:desc');
  });

  it('clears sort when already sorted descending', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable tableId="t4" columns={columns} rows={rows} getRowId={(r) => r.id} sort="name:desc" onSortChange={onSortChange} />,
    );

    await user.click(screen.getByRole('button', { name: /name/i }));
    expect(onSortChange).toHaveBeenCalledWith(undefined);
  });

  it('does not render a sort control for a non-sortable column', () => {
    renderWithProviders(<DataTable tableId="t5" columns={columns} rows={rows} getRowId={(r) => r.id} onSortChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^role$/i })).not.toBeInTheDocument();
  });

  it('selecting a row surfaces the bulk action bar, and the action receives only the selected rows', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable
        tableId="t6"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        selectable
        bulkActions={[{ label: 'Archive', onAction }]}
      />,
    );

    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();

    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
    await user.click(rowCheckboxes[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /archive/i }));
    expect(onAction).toHaveBeenCalledWith([rows[0]]);
  });

  it('"select all" selects every row and reports the full set to a bulk action', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable
        tableId="t7"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        selectable
        bulkActions={[{ label: 'Archive', onAction }]}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /select all rows/i }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /archive/i }));
    expect(onAction).toHaveBeenCalledWith(rows);
  });

  it('shows an Export CSV button only when exportFilename is supplied', () => {
    const { unmount } = renderWithProviders(<DataTable tableId="t8" columns={columns} rows={rows} getRowId={(r) => r.id} />);
    expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<DataTable tableId="t9" columns={columns} rows={rows} getRowId={(r) => r.id} exportFilename="people" />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('renders the column-visibility trigger', () => {
    renderWithProviders(<DataTable tableId="t10" columns={columns} rows={rows} getRowId={(r) => r.id} />);
    expect(screen.getByRole('button', { name: /toggle column visibility/i })).toBeInTheDocument();
  });
});
