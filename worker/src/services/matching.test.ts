import { describe, expect, it } from 'vitest';
import { computeMatchScore } from './matching';
import type { RoommateProfileRow } from '../domain/roommate';

function profile(overrides: Partial<RoommateProfileRow> = {}): RoommateProfileRow {
  return {
    id: 'p1',
    user_id: 'u1',
    headline: null,
    bio: null,
    age: 28,
    occupation: null,
    budget_min_amount: 50_000_00,
    budget_max_amount: 100_000_00,
    preferred_city: 'Lagos',
    smoking: 0,
    pets: 0,
    night_owl: 0,
    cleanliness: 4,
    social_level: 3,
    verified: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeMatchScore', () => {
  it('scores an identical profile at the top of the range', () => {
    const result = computeMatchScore(profile(), profile({ id: 'p2', user_id: 'u2' }));
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('scores a wholly incompatible profile lower than a compatible one', () => {
    const me = profile();
    const compatible = profile({ id: 'p2', user_id: 'u2', preferred_city: 'Lagos', cleanliness: 4 });
    const incompatible = profile({
      id: 'p3',
      user_id: 'u3',
      preferred_city: 'Enugu',
      budget_min_amount: 900_000_00,
      budget_max_amount: 2_000_000_00,
      smoking: 1,
      pets: 1,
      night_owl: 1,
      cleanliness: 1,
      social_level: 5,
      age: 60,
    });

    expect(computeMatchScore(me, compatible).score).toBeGreaterThan(
      computeMatchScore(me, incompatible).score
    );
  });

  it('keeps the score within 0-100', () => {
    const scores = [
      computeMatchScore(profile(), profile({ id: 'p2', user_id: 'u2' })).score,
      computeMatchScore(
        profile(),
        profile({ id: 'p3', user_id: 'u3', preferred_city: 'Kano', cleanliness: 1, age: 70 })
      ).score,
    ];
    for (const score of scores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('explains why a pair matches', () => {
    const result = computeMatchScore(profile(), profile({ id: 'p2', user_id: 'u2', preferred_city: 'Lagos' }));
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('is symmetric', () => {
    const a = profile({ age: 30, cleanliness: 5 });
    const b = profile({ id: 'p2', user_id: 'u2', age: 24, cleanliness: 3 });
    expect(computeMatchScore(a, b).score).toBe(computeMatchScore(b, a).score);
  });
});
