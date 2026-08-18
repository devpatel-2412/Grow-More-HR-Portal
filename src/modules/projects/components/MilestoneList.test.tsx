import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MilestoneList } from './MilestoneList';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

const milestone = { id: 'ms-1', projectId: 'proj-1', name: 'Phase 1', dueDate: '2026-05-01T00:00:00.000Z', status: 'PENDING' };

function mockMilestones(data: unknown[]) {
  server.use(http.get('/api/v1/projects/proj-1/milestones', () => HttpResponse.json({ data })));
}

describe('MilestoneList — permission-driven actions', () => {
  it('shows "Add milestone" and an interactive checkbox for a project:manage holder', async () => {
    server.use(handlers.meSuccessWithPermissions(['project:manage']));
    mockMilestones([milestone]);
    renderWithProviders(<MilestoneList projectId="proj-1" />);

    expect(await screen.findByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeEnabled();
  });

  it('hides "Add milestone" and disables the checkbox for a caller without project:manage', async () => {
    server.use(handlers.meSuccessWithPermissions([]));
    mockMilestones([milestone]);
    renderWithProviders(<MilestoneList projectId="proj-1" />);

    expect(await screen.findByText('Phase 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add milestone/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
