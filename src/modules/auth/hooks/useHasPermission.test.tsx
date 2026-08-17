import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHasPermission, usePermissions } from './useHasPermission';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useHasPermission', () => {
  it('returns true when the permission is in the user set', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', permissions: ['employee:create'] } });
    const { result } = renderHook(() => useHasPermission('employee:create'));
    expect(result.current).toBe(true);
  });

  it('returns false when the permission is absent', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', permissions: ['employee:read:self'] } });
    const { result } = renderHook(() => useHasPermission('employee:create'));
    expect(result.current).toBe(false);
  });

  it('returns false when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useHasPermission('employee:create'));
    expect(result.current).toBe(false);
  });
});

describe('usePermissions', () => {
  it('has() checks a single permission', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', permissions: ['sop:read'] } });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.has('sop:read')).toBe(true);
    expect(result.current.has('sop:manage')).toBe(false);
  });

  it('hasAny() checks for at least one match', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', permissions: ['leave:approve:manager'] } });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAny(['leave:approve:hr', 'leave:approve:manager'])).toBe(true);
    expect(result.current.hasAny(['leave:approve:hr'])).toBe(false);
  });

  it('hasAll() requires every permission to match', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', permissions: ['document:manage', 'document:view:self'] } });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAll(['document:manage', 'document:view:self'])).toBe(true);
    expect(result.current.hasAll(['document:manage', 'document:upload:self'])).toBe(false);
  });

  it('defaults to an empty permission set when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.permissions).toEqual([]);
    expect(result.current.has('employee:create')).toBe(false);
  });
});
