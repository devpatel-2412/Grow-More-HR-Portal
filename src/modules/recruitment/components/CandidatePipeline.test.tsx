import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidatePipeline } from './CandidatePipeline';
import { renderWithProviders } from '../../../test/test-utils';
import { STAGE_TRANSITIONS, type CandidateRecord } from '../types/recruitment.types';

function makeCandidate(overrides: Partial<CandidateRecord> = {}): CandidateRecord {
  return {
    id: 'cand-1',
    tenantId: 'tenant-1',
    jobPostingId: 'job-1',
    firstName: 'Casey',
    lastName: 'Candidate',
    email: 'casey@example.com',
    phone: null,
    resumeUrl: null,
    parsedSkills: null,
    source: null,
    status: 'APPLIED',
    rating: 0,
    notes: null,
    rejectionReason: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CandidatePipeline', () => {
  it('places each candidate under their current stage', () => {
    renderWithProviders(
      <CandidatePipeline
        candidates={[
          makeCandidate({ id: 'c1', firstName: 'Ann', status: 'APPLIED' }),
          makeCandidate({ id: 'c2', firstName: 'Ben', status: 'OFFER' }),
        ]}
        onOpenCandidate={vi.fn()}
      />,
    );

    expect(screen.getByText('Ann Candidate')).toBeInTheDocument();
    expect(screen.getByText('Ben Candidate')).toBeInTheDocument();
    // Three of the five stage columns hold nobody.
    expect(screen.getAllByText('Empty')).toHaveLength(3);
  });

  it('opens a candidate when their name is clicked', async () => {
    const onOpenCandidate = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CandidatePipeline candidates={[makeCandidate()]} onOpenCandidate={onOpenCandidate} />);

    await user.click(screen.getByText('Casey Candidate'));
    expect(onOpenCandidate).toHaveBeenCalledWith(expect.objectContaining({ id: 'cand-1' }));
  });

  it('shows a move control for a candidate who can still advance', () => {
    renderWithProviders(<CandidatePipeline candidates={[makeCandidate({ status: 'APPLIED' })]} onOpenCandidate={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: /move casey candidate/i })).toBeInTheDocument();
  });

  // The options inside the control come straight from STAGE_TRANSITIONS. Radix's Select cannot be
  // opened under jsdom (it relies on pointer-capture APIs jsdom does not implement), so the option
  // set is asserted against the map itself — it must stay in lockstep with the server's pipeline.
  it('mirrors the server pipeline rules in its transition map', () => {
    expect(STAGE_TRANSITIONS.APPLIED).toEqual(['SCREENING', 'REJECTED']);
    expect(STAGE_TRANSITIONS.SCREENING).toEqual(['INTERVIEW', 'REJECTED']);
    expect(STAGE_TRANSITIONS.INTERVIEW).toEqual(['OFFER', 'REJECTED']);
    expect(STAGE_TRANSITIONS.OFFER).toEqual(['HIRED', 'REJECTED']);
    expect(STAGE_TRANSITIONS.HIRED).toEqual([]);
    expect(STAGE_TRANSITIONS.REJECTED).toEqual([]);
  });

  it('offers no moves for a terminal candidate', () => {
    renderWithProviders(<CandidatePipeline candidates={[makeCandidate({ status: 'HIRED' })]} onOpenCandidate={vi.fn()} />);

    expect(screen.queryByRole('combobox', { name: /move casey candidate/i })).not.toBeInTheDocument();
  });
});
