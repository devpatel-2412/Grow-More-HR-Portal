import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { EmployeeTable } from './EmployeeTable';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';
import type { EmployeeListItem } from '../types/employee.types';

const employee: EmployeeListItem = {
  id: 'emp-1',
  userId: 'u2',
  employeeId: 'EMP-001',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: null,
  address: null,
  emergencyContact: null,
  department: 'Engineering',
  designation: 'Engineer',
  dateOfJoining: '2025-01-01T00:00:00.000Z',
  dateOfBirth: null,
  status: 'ACTIVE',
  managerId: null,
  branchId: null,
  teamId: null,
  avatarUrl: null,
};

describe('EmployeeTable', () => {
  it('shows an Actions column with an edit trigger when the user holds employee:update', async () => {
    server.use(handlers.meSuccessWithPermissions(['employee:update']));
    renderWithProviders(<EmployeeTable employees={[employee]} />);

    expect(await screen.findByText('Actions')).toBeInTheDocument();
    // The desktop table and the sm:hidden mobile-card layout both render an edit trigger for the
    // same row (only one is visible per breakpoint, but both exist in the DOM) — assert at least one.
    expect(screen.getAllByRole('button', { name: /edit jane doe/i }).length).toBeGreaterThan(0);
  });

  it('omits the Actions column entirely when the user lacks employee:update', async () => {
    server.use(handlers.meSuccessWithPermissions(['employee:read:tenant']));
    renderWithProviders(<EmployeeTable employees={[employee]} />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('EMP-001')).toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit jane doe/i })).not.toBeInTheDocument();
  });
});
