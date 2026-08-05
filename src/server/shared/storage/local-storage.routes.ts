import { Router } from 'express';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolveLocalStoragePath, verifyLocalStorageSignature } from './local-storage.service.js';

/**
 * Dev-only stand-in for a real cloud provider's signed-URL download — never mounted with a real
 * bucket configured (see app.ts). Deliberately outside the normal JWT auth chain: a real signed
 * URL from S3/Supabase doesn't carry a session either, its security is entirely the signature +
 * expiry embedded in the URL itself, which this route reproduces via HMAC + a timestamp.
 */
export const localStorageRouter = Router();

localStorageRouter.get('/:key', async (req, res) => {
  const { key } = req.params;
  const { expires, signature } = req.query;

  if (typeof expires !== 'string' || typeof signature !== 'string' || !verifyLocalStorageSignature(key, expires, signature)) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Invalid or expired download link' } });
    return;
  }

  const fullPath = resolveLocalStoragePath(key);
  try {
    const stats = await stat(fullPath);
    res.setHeader('Content-Length', stats.size);
    createReadStream(fullPath).pipe(res);
  } catch {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
});
