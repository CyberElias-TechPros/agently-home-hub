import type { RoommateProfileRow } from '../domain/roommate';

/**
 * Roommate compatibility scoring.
 *
 * This is deliberately a transparent, deterministic weighted model rather than
 * an opaque "AI match" claim. Every point in the score maps to a reason we can
 * show the user, which makes the number explainable and lets us test it.
 */

export interface MatchResult {
  /** 0-100. */
  score: number;
  reasons: string[];
}

const WEIGHTS = {
  budgetOverlap: 30,
  lifestyle: 22,
  habits: 20,
  location: 18,
  ageProximity: 10,
};

export function computeMatchScore(a: RoommateProfileRow, b: RoommateProfileRow): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  /* Budget overlap — the hardest constraint in practice. */
  const aMin = a.budget_min_amount ?? 0;
  const aMax = a.budget_max_amount ?? Number.MAX_SAFE_INTEGER;
  const bMin = b.budget_min_amount ?? 0;
  const bMax = b.budget_max_amount ?? Number.MAX_SAFE_INTEGER;
  const overlapMin = Math.max(aMin, bMin);
  const overlapMax = Math.min(aMax, bMax);

  if (overlapMax > overlapMin) {
    const spanA = Math.max(1, aMax - aMin);
    const spanB = Math.max(1, bMax - bMin);
    const overlap = overlapMax - overlapMin;
    const ratio = Math.min(1, overlap / Math.min(spanA, spanB));
    score += WEIGHTS.budgetOverlap * ratio;
    if (ratio > 0.5) reasons.push('Compatible budgets');
  } else if (aMin === 0 && bMin === 0) {
    // Neither published a budget: neutral rather than penalising.
    score += WEIGHTS.budgetOverlap * 0.5;
  } else {
    reasons.push('Budgets do not overlap');
  }

  /* Cleanliness and social level — the two things people actually fight about. */
  const cleanlinessDelta = Math.abs(a.cleanliness - b.cleanliness);
  const socialDelta = Math.abs(a.social_level - b.social_level);
  const lifestyleScore = (5 - cleanlinessDelta) / 5;
  const socialScore = (5 - socialDelta) / 5;
  score += WEIGHTS.lifestyle * (lifestyleScore * 0.6 + socialScore * 0.4);
  if (cleanlinessDelta <= 1) reasons.push('Similar cleanliness standards');
  if (socialDelta <= 1) reasons.push('Similar social energy');

  /* Hard-ish habits. Matching non-smokers and pet preferences matter more than
     schedule, so they carry more of the weight. */
  let habits = 0;
  if (a.smoking === b.smoking) {
    habits += 0.5;
    reasons.push(a.smoking === 1 ? 'Both smoke' : 'Both non-smoking');
  }
  if (a.pets === b.pets) {
    habits += 0.3;
    reasons.push(a.pets === 1 ? 'Both comfortable with pets' : 'Both pet-free');
  }
  if (a.night_owl === b.night_owl) {
    habits += 0.2;
    reasons.push(a.night_owl === 1 ? 'Both night owls' : 'Both early risers');
  }
  score += WEIGHTS.habits * habits;

  /* Location. */
  if (a.preferred_city && b.preferred_city) {
    if (a.preferred_city.toLowerCase() === b.preferred_city.toLowerCase()) {
      score += WEIGHTS.location;
      reasons.push(`Both looking in ${a.preferred_city}`);
    }
  } else {
    score += WEIGHTS.location * 0.4;
  }

  /* Age proximity — mild signal, mostly about life stage. */
  if (a.age !== null && b.age !== null) {
    const delta = Math.abs(a.age - b.age);
    const ratio = Math.max(0, 1 - delta / 20);
    score += WEIGHTS.ageProximity * ratio;
    if (delta <= 5) reasons.push('Similar age');
  } else {
    score += WEIGHTS.ageProximity * 0.5;
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return { score: bounded, reasons: reasons.slice(0, 4) };
}
