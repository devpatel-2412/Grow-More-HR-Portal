import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encryption.util.js';

describe('encryption.util', () => {
  it('encrypts and decrypts a round trip correctly', () => {
    const plainText = 'JBSWY3DPEHPK3PXP';
    const encrypted = encrypt(plainText);
    expect(encrypted).not.toBe(plainText);
    expect(decrypt(encrypted)).toBe(plainText);
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    const a = encrypt('same-secret');
    const b = encrypt('same-secret');
    expect(a).not.toBe(b);
  });

  it('throws when the payload is tampered with (auth tag mismatch)', () => {
    const encrypted = encrypt('secret-value');
    const [iv, authTag, ciphertext] = encrypted.split(':');
    const tamperedCiphertext = ciphertext.slice(0, -2) + (ciphertext.at(-2) === 'A' ? 'B' : 'A') + ciphertext.at(-1);
    expect(() => decrypt([iv, authTag, tamperedCiphertext].join(':'))).toThrow();
  });

  it('throws on a malformed payload', () => {
    expect(() => decrypt('not-a-valid-payload')).toThrow();
  });
});
