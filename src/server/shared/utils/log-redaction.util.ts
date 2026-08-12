import type { SerializedRequest, SerializedResponse } from 'pino-std-serializers';

const REDACTED = '[REDACTED]';

// Case-insensitive: Node normalizes incoming header names to lowercase, and res.getHeaders()
// does the same for outgoing ones, but this doesn't rely on that — it's defensive either way.
const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'proxy-authorization',
]);

/**
 * Returns a new headers object with sensitive values replaced — never mutates the input. The
 * request serializer's `headers` is a live reference to the real `req.headers` (pino-std-serializers
 * assigns it directly, not a copy), and `authenticateAccessToken` reads `req.headers.authorization`
 * on the same request later in the middleware chain — mutating in place would zero out the very
 * header auth depends on for every request that gets logged before it's authenticated.
 */
export function redactSensitiveHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  const redacted: Record<string, string> = { ...headers };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      redacted[key] = REDACTED;
    }
  }
  return redacted;
}

/** pino-http request serializer — receives the already-serialized object (see pino-std-serializers'
 * wrapRequestSerializer), so this only needs to redact, not build the object from scratch. */
export function redactedReqSerializer(req: SerializedRequest): SerializedRequest {
  return { ...req, headers: redactSensitiveHeaders(req.headers) };
}

/** Same wrapping contract as the request serializer — catches Set-Cookie on the response side. */
export function redactedResSerializer(res: SerializedResponse): SerializedResponse {
  return { ...res, headers: redactSensitiveHeaders(res.headers) };
}
