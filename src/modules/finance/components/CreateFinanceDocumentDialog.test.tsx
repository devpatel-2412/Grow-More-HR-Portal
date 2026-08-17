import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateFinanceDocumentDialog } from './CreateFinanceDocumentDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('CreateFinanceDocumentDialog', () => {
  it('computes subtotal, tax, and total live as line items and tax rate change', async () => {
    server.use(handlers.meSuccessWithPermissions(['finance:manage']));
    const user = userEvent.setup();
    renderWithProviders(<CreateFinanceDocumentDialog />);

    await user.click(await screen.findByRole('button', { name: /new document/i }));

    const qtyInput = await screen.findByPlaceholderText('Qty');
    const priceInput = screen.getByPlaceholderText('Unit price');
    await user.clear(qtyInput);
    await user.type(qtyInput, '3');
    await user.clear(priceInput);
    await user.type(priceInput, '50');

    const taxInput = screen.getByLabelText(/tax rate/i);
    await user.clear(taxInput);
    await user.type(taxInput, '10');

    // 3 * 50 = 150 subtotal, 10% tax = 15.00, total = 165.00. Setting a non-zero tax rate up
    // front keeps subtotal/tax/total distinct — at 0% tax, subtotal and total both read "150.00"
    // and match ambiguously by text alone.
    expect(await screen.findByText('150.00')).toBeInTheDocument();
    expect(await screen.findByText('15.00')).toBeInTheDocument();
    expect(await screen.findByText('165.00')).toBeInTheDocument();
  });

  it('requires at least one line item with a description', async () => {
    server.use(handlers.meSuccessWithPermissions(['finance:manage']));
    const user = userEvent.setup();
    renderWithProviders(<CreateFinanceDocumentDialog />);

    await user.click(await screen.findByRole('button', { name: /new document/i }));
    await user.click(await screen.findByRole('button', { name: /^create draft$/i }));

    expect(await screen.findByText(/^required$/i)).toBeInTheDocument();
  });

  it('submits successfully and closes the dialog', async () => {
    server.use(handlers.financeCreateSuccess);
    server.use(handlers.meSuccessWithPermissions(['finance:manage']));
    const user = userEvent.setup();
    renderWithProviders(<CreateFinanceDocumentDialog />);

    await user.click(await screen.findByRole('button', { name: /new document/i }));
    await user.type(await screen.findByPlaceholderText('Description'), 'Consulting');
    await user.clear(screen.getByPlaceholderText('Unit price'));
    await user.type(screen.getByPlaceholderText('Unit price'), '500');
    await user.click(screen.getByRole('button', { name: /^create draft$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
