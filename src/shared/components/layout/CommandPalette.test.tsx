import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../../../modules/auth/context/AuthContext';

vi.mock('../../../modules/auth/context/AuthContext');
const mockUseAuth = vi.mocked(useAuth);

// Mirrors ROLE_PERMISSIONS.ADMIN / .EMPLOYEE from src/server/shared/permissions/permissions.ts —
// enough of each role's real default permission set to exercise every NAV_ITEMS entry these tests
// touch (Attendance, Payroll, Settings).
const ADMIN_PERMISSIONS = [
  'attendance:self',
  'payroll:read:tenant',
  'tenant:update',
  'employee:read:tenant',
  'leave:view:self',
];
const EMPLOYEE_PERMISSIONS = ['attendance:self', 'leave:view:self'];

function renderPalette(role: string, permissions: string[] = role === 'EMPLOYEE' ? EMPLOYEE_PERMISSIONS : ADMIN_PERMISSIONS) {
  mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'a@b.com', role, status: 'ACTIVE', permissions } } as never);
  return render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );
}

describe('CommandPalette', () => {
  it('is closed until Ctrl+K is pressed', async () => {
    const user = userEvent.setup();
    renderPalette('ADMIN');
    expect(screen.queryByPlaceholderText('Jump to a page…')).not.toBeInTheDocument();

    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByPlaceholderText('Jump to a page…')).toBeInTheDocument();
  });

  it('toggles closed again on a second Ctrl+K', async () => {
    const user = userEvent.setup();
    renderPalette('ADMIN');

    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByPlaceholderText('Jump to a page…')).toBeInTheDocument();

    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByPlaceholderText('Jump to a page…')).not.toBeInTheDocument();
  });

  it('only offers pages the current role can access', async () => {
    const user = userEvent.setup();
    renderPalette('EMPLOYEE');
    await user.keyboard('{Control>}k{/Control}');

    const results = screen.getByRole('listbox');
    expect(within(results).getByText('Attendance')).toBeInTheDocument();
    // Settings is SUPER_ADMIN/ADMIN only — an EMPLOYEE must never see it as a jump target.
    expect(within(results).queryByText('Settings')).not.toBeInTheDocument();
  });

  it('filters results as the user types', async () => {
    const user = userEvent.setup();
    renderPalette('ADMIN');
    await user.keyboard('{Control>}k{/Control}');

    await user.type(screen.getByPlaceholderText('Jump to a page…'), 'payroll');

    const results = screen.getByRole('listbox');
    expect(within(results).getByText('Payroll')).toBeInTheDocument();
    expect(within(results).queryByText('Attendance')).not.toBeInTheDocument();
  });

  it('shows a no-results message for a query matching nothing', async () => {
    const user = userEvent.setup();
    renderPalette('ADMIN');
    await user.keyboard('{Control>}k{/Control}');

    await user.type(screen.getByPlaceholderText('Jump to a page…'), 'zzzznonexistent');
    expect(await screen.findByText('No matching pages.')).toBeInTheDocument();
  });

  it('navigates on Enter and closes the palette', async () => {
    const user = userEvent.setup();
    renderPalette('ADMIN');
    await user.keyboard('{Control>}k{/Control}');

    await user.type(screen.getByPlaceholderText('Jump to a page…'), 'payroll');
    await user.keyboard('{Enter}');

    expect(screen.queryByPlaceholderText('Jump to a page…')).not.toBeInTheDocument();
  });
});
