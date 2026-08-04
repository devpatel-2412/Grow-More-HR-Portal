import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnVisibility } from './useColumnVisibility';

describe('useColumnVisibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with every column visible by default', () => {
    const { result } = renderHook(() => useColumnVisibility('test-table', ['a', 'b', 'c']));
    expect(result.current.isVisible('a')).toBe(true);
    expect(result.current.isVisible('b')).toBe(true);
    expect(result.current.visibleCount).toBe(3);
  });

  it('respects an explicit default-hidden list', () => {
    const { result } = renderHook(() => useColumnVisibility('test-table-2', ['a', 'b'], ['b']));
    expect(result.current.isVisible('a')).toBe(true);
    expect(result.current.isVisible('b')).toBe(false);
  });

  it('toggling a visible column hides it, and toggling again shows it', () => {
    const { result } = renderHook(() => useColumnVisibility('test-table-3', ['a', 'b']));

    act(() => result.current.toggle('a'));
    expect(result.current.isVisible('a')).toBe(false);

    act(() => result.current.toggle('a'));
    expect(result.current.isVisible('a')).toBe(true);
  });

  it('persists hidden columns to localStorage under a key scoped to the table id', () => {
    const { result } = renderHook(() => useColumnVisibility('persisted-table', ['a', 'b']));
    act(() => result.current.toggle('b'));

    const stored = JSON.parse(localStorage.getItem('datatable:columns:persisted-table') ?? '[]');
    expect(stored).toEqual(['b']);
  });

  it('restores hidden columns from localStorage on next mount', () => {
    localStorage.setItem('datatable:columns:restore-table', JSON.stringify(['a']));
    const { result } = renderHook(() => useColumnVisibility('restore-table', ['a', 'b']));
    expect(result.current.isVisible('a')).toBe(false);
    expect(result.current.isVisible('b')).toBe(true);
  });

  it('reset clears back to the default-hidden set', () => {
    const { result } = renderHook(() => useColumnVisibility('reset-table', ['a', 'b'], ['a']));
    act(() => result.current.toggle('b'));
    expect(result.current.isVisible('b')).toBe(false);

    act(() => result.current.reset());
    expect(result.current.isVisible('a')).toBe(false);
    expect(result.current.isVisible('b')).toBe(true);
  });
});
