import { describe, it, expect } from 'vitest';
import { acceptInviteSchema } from './user.validators.js';

function validBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    token: 'raw-token',
    password: 'CorrectPassword123',
    firstName: 'Ada',
    lastName: 'Lovelace',
    acceptedTerms: true,
    ...overrides,
  };
}

describe('acceptInviteSchema — acceptedTerms', () => {
  it('accepts a body where acceptedTerms is true', () => {
    expect(acceptInviteSchema.safeParse(validBody()).success).toBe(true);
  });

  it('rejects a body missing acceptedTerms entirely', () => {
    const { acceptedTerms: _omit, ...body } = validBody();
    const result = acceptInviteSchema.safeParse(body);
    expect(result.success).toBe(false);
  });

  it('rejects a body where acceptedTerms is explicitly false', () => {
    const result = acceptInviteSchema.safeParse(validBody({ acceptedTerms: false }));
    expect(result.success).toBe(false);
  });
});
