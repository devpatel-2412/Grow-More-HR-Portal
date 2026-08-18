// Cross-tab "logout in one tab logs out all tabs" — a BroadcastChannel is the right primitive
// here (not localStorage's storage event) since the access token is deliberately memory-only
// per-tab and there's nothing to persist, just a fire-and-forget signal between same-origin tabs.
const CHANNEL_NAME = 'grow-more-session';

interface LogoutMessage {
  type: 'logout';
}

interface AccessTokenMessage {
  type: 'access-token';
  token: string | null;
}

type SessionMessage = LogoutMessage | AccessTokenMessage;

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

/**
 * Lets a tab that just rotated the access token hand the new value straight to sibling tabs, so
 * they can adopt it instead of racing to rotate the same single-use refresh-token cookie — two
 * tabs both presenting that cookie to POST /auth/refresh at once makes the loser's legitimate
 * attempt look identical to token-reuse/theft, and the backend revokes the whole session (see
 * api-client.ts's cross-tab refresh lock, which this pairs with).
 */
export function broadcastAccessToken(token: string | null): void {
  getChannel()?.postMessage({ type: 'access-token', token } satisfies SessionMessage);
}

/** Returns an unsubscribe function. */
export function subscribeToAccessToken(onToken: (token: string | null) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  function handleMessage(event: MessageEvent<SessionMessage>) {
    if (event.data?.type === 'access-token') onToken(event.data.token);
  }

  ch.addEventListener('message', handleMessage);
  return () => ch!.removeEventListener('message', handleMessage);
}
