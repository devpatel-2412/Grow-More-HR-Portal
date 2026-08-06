import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { broadcastLogout, subscribeToLogout } from './session-broadcast';

// BroadcastChannel doesn't loop a message back to the same channel instance that sent it (by
// design — that's exactly what makes it safe against self-triggered logout loops), so these tests
// use a second, raw channel of the same name to stand in for "another tab".
describe('session-broadcast', () => {
  it('broadcastLogout delivers a message to another same-origin listener (simulating another tab)', async () => {
    const otherTab = new BroadcastChannel('grow-more-session');
    const received = vi.fn();
    otherTab.addEventListener('message', (event) => received(event.data));

    broadcastLogout();

    await waitFor(() => expect(received).toHaveBeenCalledWith({ type: 'logout' }));
    otherTab.close();
  });

  it('subscribeToLogout fires when a logout message arrives from another tab', async () => {
    const onLogout = vi.fn();
    const unsubscribe = subscribeToLogout(onLogout);
    const otherTab = new BroadcastChannel('grow-more-session');

    otherTab.postMessage({ type: 'logout' });

    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce());

    unsubscribe();
    otherTab.close();
  });

  it('the returned unsubscribe function stops further delivery', async () => {
    const onLogout = vi.fn();
    const unsubscribe = subscribeToLogout(onLogout);
    const otherTab = new BroadcastChannel('grow-more-session');

    unsubscribe();
    otherTab.postMessage({ type: 'logout' });
    // Give any (incorrectly still-attached) listener a chance to fire before asserting it didn't.
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onLogout).not.toHaveBeenCalled();
    otherTab.close();
  });
});
