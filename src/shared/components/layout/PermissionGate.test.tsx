import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { PermissionGate } from './PermissionGate';

const mockUseAuth = vi.fn();
vi.mock('../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithPermissions(permissions: string[] | null, ui: ReactNode) {
  mockUseAuth.mockReturnValue({
    user: permissions ? { id: '1', email: 'a@b.com', role: 'EMPLOYEE', status: 'ACTIVE', permissions } : null,
  });
  return render(ui);
}

describe('PermissionGate', () => {
  it('renders children when the user holds the required permission', () => {
    renderWithPermissions(['employee:read:tenant'], <PermissionGate permission="employee:read:tenant">Visible</PermissionGate>);
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('renders the fallback (default null) when the user lacks the required permission', () => {
    renderWithPermissions(['employee:read:self'], <PermissionGate permission="employee:create">Hidden</PermissionGate>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    renderWithPermissions([], <PermissionGate permission="employee:create" fallback={<span>No access</span>}>Hidden</PermissionGate>);
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  it('renders children when the user holds any permission in `anyOf`', () => {
    renderWithPermissions(
      ['leave:approve:manager'],
      <PermissionGate anyOf={['leave:approve:hr', 'leave:approve:manager']}>Approvals</PermissionGate>,
    );
    expect(screen.getByText('Approvals')).toBeInTheDocument();
  });

  it('hides children when the user holds none of `anyOf`', () => {
    renderWithPermissions(['leave:apply'], <PermissionGate anyOf={['leave:approve:hr', 'leave:approve:manager']}>Approvals</PermissionGate>);
    expect(screen.queryByText('Approvals')).not.toBeInTheDocument();
  });

  it('requires every permission in `allOf`', () => {
    renderWithPermissions(
      ['document:manage'],
      <PermissionGate allOf={['document:manage', 'document:view:self']}>Both</PermissionGate>,
    );
    expect(screen.queryByText('Both')).not.toBeInTheDocument();
  });

  it('renders children unconditionally when no permission prop is given', () => {
    renderWithPermissions([], <PermissionGate>Always</PermissionGate>);
    expect(screen.getByText('Always')).toBeInTheDocument();
  });

  it('hides children when there is no user at all', () => {
    renderWithPermissions(null, <PermissionGate permission="employee:read:tenant">Visible</PermissionGate>);
    expect(screen.queryByText('Visible')).not.toBeInTheDocument();
  });
});
