import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, sha256, generateOpaqueToken } from './hash.util.js';

describe('hash.util', () => {
  it('hashes a password and verifies the correct plaintext against it', () => {
    const hash = hashPassword('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    expect(verifyPassword('Sup3rSecret!', hash)).toBe(true);
  });

  it('rejects an incorrect password against a valid hash', () => {
    const hash = hashPassword('Sup3rSecret!');
    expect(verifyPassword('WrongPassword!', hash)).toBe(false);
  });

  it('produces a deterministic sha256 hash for the same input', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).not.toBe(sha256('abd'));
  });

  it('generates opaque tokens that are unique and URL-safe', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
