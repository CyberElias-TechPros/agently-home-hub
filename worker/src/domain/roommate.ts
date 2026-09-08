export interface RoommateProfileRow {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  age: number | null;
  occupation: string | null;
  budget_min_amount: number | null;
  budget_max_amount: number | null;
  preferred_city: string | null;
  smoking: number;
  pets: number;
  night_owl: number;
  cleanliness: number;
  social_level: number;
  verified: number;
  created_at: string;
  updated_at: string;
}

export function toRoommateProfileDto(row: RoommateProfileRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    headline: row.headline,
    bio: row.bio,
    age: row.age,
    occupation: row.occupation,
    budget_min: row.budget_min_amount === null ? null : row.budget_min_amount / 100,
    budget_max: row.budget_max_amount === null ? null : row.budget_max_amount / 100,
    preferred_city: row.preferred_city,
    smoking: row.smoking === 1,
    pets: row.pets === 1,
    night_owl: row.night_owl === 1,
    cleanliness: row.cleanliness,
    social_level: row.social_level,
    verified: row.verified === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
