// Cross-tab "logout in one tab logs out all tabs" — a BroadcastChannel is the right primitive
// here (not localStorage's storage event) since the access token is deliberately memory-only
// per-tab and there's nothing to persist, just a fire-and-forget signal between same-origin tabs.
const CHANNEL_NAME = 'grow-more-session';

interface SessionMessage {
  type: 'logout';
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastLogout(): void {
  getChannel()?.postMessage({ type: 'logout' } satisfies SessionMessage);
}

/** Returns an unsubscribe function. */
export function subscribeToLogout(onLogout: () => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  function handleMessage(event: MessageEvent<SessionMessage>) {
    if (event.data?.type === 'logout') onLogout();
  }

  ch.addEventListener('message', handleMessage);
  return () => ch!.removeEventListener('message', handleMessage);
}
