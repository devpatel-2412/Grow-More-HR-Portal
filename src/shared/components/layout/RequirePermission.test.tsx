import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequirePermission } from './RequirePermission';

const mockUseAuth = vi.fn();
vi.mock('../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithPermissions(permissions: string[] | null) {
  mockUseAuth.mockReturnValue({
    user: permissions ? { id: '1', email: 'a@b.com', role: 'EMPLOYEE', status: 'ACTIVE', permissions } : null,
  });

  return render(
    <MemoryRouter initialEntries={['/employees']}>
      <Routes>
        <Route element={<RequirePermission permission="employee:read:tenant" />}>
          <Route path="/employees" element={<div>Employee directory</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequirePermission', () => {
  it('renders the route when the user holds the required permission', () => {
    renderWithPermissions(['employee:read:tenant']);
    expect(screen.getByText('Employee directory')).toBeInTheDocument();
  });

  it('renders the 403 page when the user lacks the required permission', () => {
    renderWithPermissions(['employee:read:self']);
    expect(screen.queryByText('Employee directory')).not.toBeInTheDocument();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('renders the 403 page when there is no user', () => {
    renderWithPermissions(null);
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('renders its children directly (not just an Outlet) when used as a leaf wrapper', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', email: 'a@b.com', role: 'EMPLOYEE', status: 'ACTIVE', permissions: ['project:manage'] } });
    render(
      <RequirePermission permission="project:manage">
        <div>Leaf content</div>
      </RequirePermission>,
    );
    expect(screen.getByText('Leaf content')).toBeInTheDocument();
  });
});
