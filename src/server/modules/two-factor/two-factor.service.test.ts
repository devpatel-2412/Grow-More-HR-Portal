import { describe, it, expect } from 'vitest';
import { generate } from 'otplib';
import { TwoFactorService } from './two-factor.service.js';
import { decrypt } from '../../shared/utils/encryption.util.js';

describe('TwoFactorService', () => {
  const service = new TwoFactorService();

  it('begins enrollment with a raw secret, a QR data URL, and a matching encrypted secret', async () => {
    const enrollment = await service.beginEnrollment('user@acme.com');
    expect(enrollment.secret).toMatch(/^[A-Z2-7]+$/); // base32
    expect(enrollment.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(decrypt(enrollment.encryptedSecret)).toBe(enrollment.secret);
  });

  it('verifies a currently-valid TOTP code against the encrypted secret', async () => {
    const enrollment = await service.beginEnrollment('user@acme.com');
    const validCode = await generate({ secret: enrollment.secret });
    expect(service.verifyCode(enrollment.encryptedSecret, validCode)).toBe(true);
  });

  it('rejects an incorrect TOTP code', async () => {
    const enrollment = await service.beginEnrollment('user@acme.com');
    const validCode = await generate({ secret: enrollment.secret });
    const wrongCode = validCode === '000000' ? '111111' : '000000';
    expect(service.verifyCode(enrollment.encryptedSecret, wrongCode)).toBe(false);
  });

  it('generates recovery codes whose plain values hash to the returned hashed values', () => {
    const { plain, hashed } = service.generateRecoveryCodes();
    expect(plain).toHaveLength(10);
    expect(hashed).toHaveLength(10);
    expect(new Set(plain).size).toBe(10); // all unique
  });

  it('verifyRecoveryCode accepts a valid code exactly once and removes it from the remaining list', () => {
    const { plain, hashed } = service.generateRecoveryCodes();
    const first = plain[0];

    const result = service.verifyRecoveryCode(hashed, first);
    expect(result.valid).toBe(true);
    expect(result.remaining).toHaveLength(9);

    const secondAttempt = service.verifyRecoveryCode(result.remaining, first);
    expect(secondAttempt.valid).toBe(false);
  });

  it('verifyRecoveryCode rejects an unknown code', () => {
    const { hashed } = service.generateRecoveryCodes();
    const result = service.verifyRecoveryCode(hashed, 'not-a-real-code');
    expect(result.valid).toBe(false);
    expect(result.remaining).toHaveLength(10);
  });
});
