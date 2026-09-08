import { describe, expect, it } from 'vitest';
import { assessPassword } from '../lib/crypto';

/**
 * Password policy is the first line of defence for an account, so the rules are
 * pinned here rather than left implicit in the route handler.
 */
describe('assessPassword', () => {
  it('accepts a strong password', () => {
    const result = assessPassword('Corrugated7-Harbour');
    expect(result.valid).toBe(true);
    expect(result.problems).toHaveLength(0);
  });

  it('rejects a password that is too short', () => {
    const result = assessPassword('Ab3!xyz');
    expect(result.valid).toBe(false);
    expect(result.problems.join(' ')).toMatch(/10 characters/);
  });

  it('does not demand character-composition rules', () => {
    // Length is what matters; forcing `Password1!` trades entropy for appearance.
    expect(assessPassword('corrugated7harbour').valid).toBe(true);
    expect(assessPassword('CorrugatedHarbour').valid).toBe(true);
  });

  it('rejects a very common password', () => {
    expect(assessPassword('Password123').valid).toBe(false);
  });

  it('sees through leet substitutions', () => {
    expect(assessPassword('p4ssw0rd-lagos').valid).toBe(false);
  });

  it('rejects a password longer than the supported maximum', () => {
    expect(assessPassword('a'.repeat(201)).valid).toBe(false);
  });

  it('rejects a password that is one character repeated', () => {
    expect(assessPassword('a'.repeat(20)).valid).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(assessPassword('').valid).toBe(false);
  });
});
