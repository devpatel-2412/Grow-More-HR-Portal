import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { encrypt, decrypt } from '../../shared/utils/encryption.util.js';
import { sha256 } from '../../shared/utils/hash.util.js';
import { env } from '../../shared/config/env.js';

/** crypto.timingSafeEqual requires equal-length buffers (it throws otherwise) — the length check
 * here is just that guard, not a security-relevant early exit: every hash compared against this
 * is a fixed-length SHA-256 hex digest, so a length mismatch only ever means malformed input. */
function timingSafeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export interface TwoFactorEnrollment {
  secret: string; // raw, shown once to the user for manual entry
  qrCodeDataUrl: string;
  encryptedSecret: string; // to be persisted on the user record only after enable() confirms a valid code
}

const RECOVERY_CODE_COUNT = 10;

export class TwoFactorService {
  async beginEnrollment(email: string): Promise<TwoFactorEnrollment> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: env.TWO_FA_ISSUER, label: email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, qrCodeDataUrl, encryptedSecret: encrypt(secret) };
  }

  verifyCode(encryptedSecret: string, code: string): boolean {
    const secret = decrypt(encryptedSecret);
    return verifySync({ token: code, secret }).valid;
  }

  /** Recovery codes are shown to the user exactly once; only their SHA-256 hashes are ever persisted. */
  generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
    const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      crypto.randomBytes(5).toString('hex').match(/.{1,5}/g)!.join('-'),
    );
    return { plain, hashed: plain.map(sha256) };
  }

  verifyRecoveryCode(hashedCodes: string[], candidate: string): { valid: boolean; remaining: string[] } {
    const candidateHash = sha256(candidate.trim().toLowerCase());
    // Constant-time per-hash comparison (not indexOf's ordinary, early-exiting string equality) —
    // the same defense-in-depth a password-hash comparison gets, closing off any timing
    // side-channel on the individual hash bytes even though these are hashes of high-entropy
    // random codes rather than directly guessable secrets.
    const index = hashedCodes.findIndex((hash) => timingSafeHashEqual(hash, candidateHash));
    if (index === -1) return { valid: false, remaining: hashedCodes };
    const remaining = [...hashedCodes.slice(0, index), ...hashedCodes.slice(index + 1)];
    return { valid: true, remaining };
  }
}

export const twoFactorService = new TwoFactorService();
