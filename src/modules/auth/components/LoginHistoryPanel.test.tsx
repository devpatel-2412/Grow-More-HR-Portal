import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginHistoryPanel } from './LoginHistoryPanel';
import { useLoginHistory } from '../hooks/useLoginHistory';

vi.mock('../hooks/useLoginHistory');
const mockUseLoginHistory = vi.mocked(useLoginHistory);

describe('LoginHistoryPanel', () => {
  it('shows a friendly message when there is no sign-in activity yet', () => {
    mockUseLoginHistory.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 1 } },
      isLoading: false,
    } as never);
    render(<LoginHistoryPanel />);
    expect(screen.getByText('No sign-in activity recorded yet.')).toBeInTheDocument();
  });

  it('shows a success badge and parses the browser/OS from a real user agent string', () => {
    mockUseLoginHistory.mockReturnValue({
      data: {
        data: [
          {
            id: 'e1',
            action: 'USER_LOGIN_SUCCESS',
            ipAddress: '203.0.113.5',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            createdAt: '2026-01-01T10:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
      },
      isLoading: false,
    } as never);
    render(<LoginHistoryPanel />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText(/203\.0\.113\.5/)).toBeInTheDocument();
  });

  it('shows a failure badge for a failed attempt and a fallback for a missing user agent', () => {
    mockUseLoginHistory.mockReturnValue({
      data: {
        data: [{ id: 'e2', action: 'USER_LOGIN_FAILURE', ipAddress: null, userAgent: null, createdAt: '2026-01-01T10:00:00.000Z' }],
        meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
      },
      isLoading: false,
    } as never);
    render(<LoginHistoryPanel />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Unknown device')).toBeInTheDocument();
    expect(screen.getByText(/Unknown IP/)).toBeInTheDocument();
  });
});
