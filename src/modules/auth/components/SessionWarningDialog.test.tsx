import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionWarningDialog } from './SessionWarningDialog';

describe('SessionWarningDialog', () => {
  it('renders nothing when closed', () => {
    render(<SessionWarningDialog open={false} secondsRemaining={120} onContinue={vi.fn()} onLogoutNow={vi.fn()} />);
    expect(screen.queryByText(/your session is about to expire/i)).not.toBeInTheDocument();
  });

  it('shows the formatted countdown when open', () => {
    render(<SessionWarningDialog open secondsRemaining={125} onContinue={vi.fn()} onLogoutNow={vi.fn()} />);
    expect(screen.getByText(/your session is about to expire/i)).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('pads single-digit seconds with a leading zero', () => {
    render(<SessionWarningDialog open secondsRemaining={65} onContinue={vi.fn()} onLogoutNow={vi.fn()} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('calls onContinue when "Continue Session" is clicked', async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(<SessionWarningDialog open secondsRemaining={90} onContinue={onContinue} onLogoutNow={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /continue session/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('calls onLogoutNow when "Logout Now" is clicked', async () => {
    const onLogoutNow = vi.fn();
    const user = userEvent.setup();
    render(<SessionWarningDialog open secondsRemaining={90} onContinue={vi.fn()} onLogoutNow={onLogoutNow} />);

    await user.click(screen.getByRole('button', { name: /logout now/i }));
    expect(onLogoutNow).toHaveBeenCalledOnce();
  });

  it('ignores an Escape key press — this dialog cannot be dismissed without an explicit choice', async () => {
    const onContinue = vi.fn();
    const onLogoutNow = vi.fn();
    const user = userEvent.setup();
    render(<SessionWarningDialog open secondsRemaining={90} onContinue={onContinue} onLogoutNow={onLogoutNow} />);

    await user.keyboard('{Escape}');

    expect(screen.getByText(/your session is about to expire/i)).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();
    expect(onLogoutNow).not.toHaveBeenCalled();
  });
});
