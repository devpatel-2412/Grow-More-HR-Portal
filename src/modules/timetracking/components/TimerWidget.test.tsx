import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { TimerWidget } from './TimerWidget';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('TimerWidget', () => {
  it('offers a start control when no timer is running', async () => {
    server.use(handlers.timerNotRunning, handlers.tasksEmptyList);
    renderWithProviders(<TimerWidget />);

    expect(await screen.findByRole('button', { name: /start timer/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop timer/i })).not.toBeInTheDocument();
  });

  it('switches to a stop control and hides the setup fields while running', async () => {
    server.use(handlers.timerRunning, handlers.tasksEmptyList);
    renderWithProviders(<TimerWidget />);

    expect(await screen.findByRole('button', { name: /stop timer/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start timer/i })).not.toBeInTheDocument();
    // The task/description pickers only make sense before a timer starts.
    expect(screen.queryByLabelText(/what are you working on/i)).not.toBeInTheDocument();
  });

  it('counts up from the server-provided start time', async () => {
    server.use(handlers.timerRunning, handlers.tasksEmptyList);
    renderWithProviders(<TimerWidget />);

    await screen.findByRole('button', { name: /stop timer/i });
    // The running handler starts 90s ago, so the elapsed clock must be past zero.
    expect(screen.getByText(/^00:0[12]:\d{2}$/)).toBeInTheDocument();
  });
});
