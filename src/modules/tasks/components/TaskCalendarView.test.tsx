import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { TaskCalendarView } from './TaskCalendarView';
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
    dueDate: new Date().toISOString(),
    assignedToId: null,
    loggedHours: 0,
    parentTaskId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskCalendarView', () => {
  it('calls onOpenTask with the unmodified task object when a day entry is clicked', () => {
    const onOpenTask = vi.fn();
    const task = makeTask({ title: 'Due today' });
    renderWithProviders(<TaskCalendarView tasks={[task]} onOpenTask={onOpenTask} />);

    screen.getByRole('button', { name: 'Due today' }).click();

    expect(onOpenTask).toHaveBeenCalledWith(task);
    expect(onOpenTask.mock.calls[0][0].subtasks).toBeUndefined();
  });
});
