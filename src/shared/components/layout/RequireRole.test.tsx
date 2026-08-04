import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireRole } from './RequireRole';

const mockUseAuth = vi.fn();
vi.mock('../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithUser(role: string | null) {
  mockUseAuth.mockReturnValue({ user: role ? { id: '1', email: 'a@b.com', role, status: 'ACTIVE' } : null });

  return render(
    <MemoryRouter initialEntries={['/finance']}>
      <Routes>
        <Route element={<RequireRole allow={['ADMIN', 'SUPER_ADMIN']} />}>
          <Route path="/finance" element={<div>Finance content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  it('renders the route when the user holds an allowed role', () => {
    renderWithUser('ADMIN');
    expect(screen.getByText('Finance content')).toBeInTheDocument();
  });

  it('renders the 403 page when the user holds a disallowed role', () => {
    renderWithUser('EMPLOYEE');
    expect(screen.queryByText('Finance content')).not.toBeInTheDocument();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('renders the 403 page when there is no user', () => {
    renderWithUser(null);
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });
});
