import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { TaskListTable } from './TaskListTable';
import { renderWithProviders } from '../../../test/test-utils';
import type { TaskRecord } from '../types/task.types';

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 't1',
    projectId: 'proj-1',
    title: 'Design homepage',
    description: null,
    priority: 'HIGH',
    status: 'TODO',
    dueDate: null,
    assignedToId: null,
    loggedHours: 0,
    parentTaskId: null,
    subtasks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskListTable', () => {
  it('calls onOpenTask when a row is clicked', () => {
    const onOpenTask = vi.fn();
    const tasks = [makeTask({ title: 'Clickable row' })];
    renderWithProviders(<TaskListTable tasks={tasks} onOpenTask={onOpenTask} />);

    screen.getByRole('button', { name: 'Open task Clickable row' }).click();
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Clickable row' }));
  });

  it('opens a row via the keyboard (Enter and Space), for users who cannot click', () => {
    const onOpenTask = vi.fn();
    const tasks = [makeTask({ title: 'Keyboard row' })];
    renderWithProviders(<TaskListTable tasks={tasks} onOpenTask={onOpenTask} />);

    const row = screen.getByRole('button', { name: 'Open task Keyboard row' });
    row.focus();
    expect(row).toHaveFocus();

    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onOpenTask).toHaveBeenCalledTimes(1);

    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(onOpenTask).toHaveBeenCalledTimes(2);
  });
});
