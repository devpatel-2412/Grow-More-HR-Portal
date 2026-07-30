import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublishAnnouncementDialog } from './PublishAnnouncementDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('PublishAnnouncementDialog', () => {
  it('requires a title and body', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublishAnnouncementDialog />);

    await user.click(screen.getByRole('button', { name: /new announcement/i }));
    await user.click(await screen.findByRole('button', { name: /^publish$/i }));

    expect(await screen.findAllByText(/^required$/i)).toHaveLength(2); // title + body
  });

  it('only shows the department field once DEPARTMENT audience is picked', async () => {
    renderWithProviders(<PublishAnnouncementDialog />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /new announcement/i }));

    expect(screen.queryByLabelText(/^department$/i)).not.toBeInTheDocument();
  });

  it('submits successfully and closes the dialog', async () => {
    server.use(handlers.announcementPublishSuccess);
    const user = userEvent.setup();
    renderWithProviders(<PublishAnnouncementDialog />);

    await user.click(screen.getByRole('button', { name: /new announcement/i }));
    await user.type(await screen.findByLabelText(/title/i), 'Office closed Friday');
    await user.type(screen.getByLabelText(/message/i), 'Enjoy the long weekend');
    await user.click(screen.getByRole('button', { name: /^publish$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
