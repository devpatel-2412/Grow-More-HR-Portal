import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { KanbanBoard } from './KanbanBoard';
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

describe('KanbanBoard', () => {
  it('renders each task under its status column', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'Todo task', status: 'TODO' }),
      makeTask({ id: 't2', title: 'In progress task', status: 'IN_PROGRESS' }),
      makeTask({ id: 't3', title: 'Done task', status: 'DONE' }),
    ];
    renderWithProviders(<KanbanBoard tasks={tasks} onOpenTask={vi.fn()} />);

    expect(screen.getByText('Todo task')).toBeInTheDocument();
    expect(screen.getByText('In progress task')).toBeInTheDocument();
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  it('calls onOpenTask when a card is clicked', async () => {
    const onOpenTask = vi.fn();
    const tasks = [makeTask({ title: 'Clickable task' })];
    renderWithProviders(<KanbanBoard tasks={tasks} onOpenTask={onOpenTask} />);

    screen.getByText('Clickable task').click();
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Clickable task' }));
  });

  it('opens a card via the keyboard (Enter and Space), for users who cannot click', () => {
    const onOpenTask = vi.fn();
    const tasks = [makeTask({ title: 'Keyboard task' })];
    renderWithProviders(<KanbanBoard tasks={tasks} onOpenTask={onOpenTask} />);

    const card = screen.getByRole('button', { name: 'Open task Keyboard task' });
    card.focus();
    expect(card).toHaveFocus();

    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onOpenTask).toHaveBeenCalledTimes(1);

    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(onOpenTask).toHaveBeenCalledTimes(2);
  });

  it('shows the correct count badge per column', () => {
    const tasks = [makeTask({ id: 't1', status: 'TODO' }), makeTask({ id: 't2', status: 'TODO' })];
    renderWithProviders(<KanbanBoard tasks={tasks} onOpenTask={vi.fn()} />);

    // "To do" also appears as each card's status-select value, so the column header (the first
    // match, rendered before any cards) is the one whose sibling is the count badge.
    expect(screen.getAllByText('To do')[0].nextSibling?.textContent).toBe('2');
  });
});
