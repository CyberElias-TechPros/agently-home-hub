import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok } from '../http/responses';
import { validate, parseJsonBody, paginationSchema, validateQuery } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { toRoommateProfileDto, type RoommateProfileRow } from '../domain/roommate';
import { computeMatchScore } from '../services/matching';
import { createNotification } from '../services/notifications';

const profileSchema = z.object({
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  age: z.number().int().min(18, 'You must be 18 or older to use roommate matching.').max(120).optional(),
  occupation: z.string().trim().max(120).optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  preferred_city: z.string().trim().max(100).optional(),
  smoking: z.boolean().default(false),
  pets: z.boolean().default(false),
  night_owl: z.boolean().default(false),
  cleanliness: z.number().int().min(1).max(5).default(3),
  social_level: z.number().int().min(1).max(5).default(3),
});

export const roommateRoutes = new Hono<AppEnv>();

roommateRoutes.get('/profiles', async (c: AppContext) => {
  const auth = currentAuth(c);
  const query = validateQuery(
    paginationSchema.extend({ city: z.string().trim().max(100).optional() }),
    new URL(c.req.url).searchParams
  );

  const where: string[] = ['p.user_id <> ?'];
  const params: unknown[] = [auth.userId];
  if (query.city) {
    where.push('lower(p.preferred_city) = lower(?)');
    params.push(query.city);
  }

  const rows = await queryAll<RoommateProfileRow>(
    c.env.DB,
    `SELECT p.*, u.name, u.avatar_url
       FROM roommate_profiles p
       JOIN users u ON u.id = p.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?`,
    [...params, query.per_page, (query.page - 1) * query.per_page]
  );

  const mine = await queryOne<RoommateProfileRow>(
    c.env.DB,
    `SELECT * FROM roommate_profiles WHERE user_id = ?`,
    [auth.userId]
  );

  return ok({
    data: rows.map((row) => ({
      ...toRoommateProfileDto(row),
      name: (row as unknown as { name?: string }).name ?? null,
      avatar_url: (row as unknown as { avatar_url?: string | null }).avatar_url ?? null,
      // Match score is only meaningful once the visitor has their own profile.
      match_score: mine ? computeMatchScore(mine, row).score : null,
    })),
  });
});

/** My matches: ranked by the same scoring function the UI displays. */
roommateRoutes.get('/matches', async (c: AppContext) => {
  const auth = currentAuth(c);
  const mine = await queryOne<RoommateProfileRow>(
    c.env.DB,
    `SELECT * FROM roommate_profiles WHERE user_id = ?`,
    [auth.userId]
  );
  if (!mine) {
    return ok({ data: [], meta: { profile_required: true } });
  }

  const rows = await queryAll<RoommateProfileRow & { name: string; avatar_url: string | null }>(
    c.env.DB,
    `SELECT p.*, u.name, u.avatar_url
       FROM roommate_profiles p
       JOIN users u ON u.id = p.user_id
      WHERE p.user_id <> ?
      LIMIT 200`,
    [auth.userId]
  );

  const scored = rows
    .map((row) => {
      const { score, reasons } = computeMatchScore(mine, row);
      return {
        ...toRoommateProfileDto(row),
        name: row.name,
        avatar_url: row.avatar_url,
        match_score: score,
        match_reasons: reasons,
      };
    })
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 50);

  return ok({ data: scored });
});

roommateRoutes.get('/profile', async (c: AppContext) => {
  const auth = currentAuth(c);
  const row = await queryOne<RoommateProfileRow>(
    c.env.DB,
    `SELECT * FROM roommate_profiles WHERE user_id = ?`,
    [auth.userId]
  );
  return ok({ data: row ? toRoommateProfileDto(row) : null });
});

roommateRoutes.put('/profile', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(profileSchema, await parseJsonBody(c.req.raw));

  if (body.budget_min !== undefined && body.budget_max !== undefined && body.budget_min > body.budget_max) {
    throw ApiError.validation('The minimum budget cannot exceed the maximum budget.', {
      budget_min: ['Must be less than or equal to the maximum budget.'],
    });
  }

  const existing = await queryOne<{ id: string }>(
    c.env.DB,
    `SELECT id FROM roommate_profiles WHERE user_id = ?`,
    [auth.userId]
  );

  if (existing) {
    await execute(
      c.env.DB,
      `UPDATE roommate_profiles SET
          headline = ?, bio = ?, age = ?, occupation = ?,
          budget_min_amount = ?, budget_max_amount = ?, preferred_city = ?,
          smoking = ?, pets = ?, night_owl = ?, cleanliness = ?, social_level = ?,
          updated_at = ?
        WHERE user_id = ?`,
      [
        body.headline ?? null,
        body.bio ?? null,
        body.age ?? null,
        body.occupation ?? null,
        body.budget_min === undefined ? null : Math.round(body.budget_min * 100),
        body.budget_max === undefined ? null : Math.round(body.budget_max * 100),
        body.preferred_city ?? null,
        body.smoking ? 1 : 0,
        body.pets ? 1 : 0,
        body.night_owl ? 1 : 0,
        body.cleanliness,
        body.social_level,
        nowIso(),
        auth.userId,
      ]
    );
  } else {
    await execute(
      c.env.DB,
      `INSERT INTO roommate_profiles (
          id, user_id, headline, bio, age, occupation, budget_min_amount, budget_max_amount,
          preferred_city, smoking, pets, night_owl, cleanliness, social_level, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        auth.userId,
        body.headline ?? null,
        body.bio ?? null,
        body.age ?? null,
        body.occupation ?? null,
        body.budget_min === undefined ? null : Math.round(body.budget_min * 100),
        body.budget_max === undefined ? null : Math.round(body.budget_max * 100),
        body.preferred_city ?? null,
        body.smoking ? 1 : 0,
        body.pets ? 1 : 0,
        body.night_owl ? 1 : 0,
        body.cleanliness,
        body.social_level,
        nowIso(),
        nowIso(),
      ]
    );
  }

  const row = await queryOne<RoommateProfileRow>(
    c.env.DB,
    `SELECT * FROM roommate_profiles WHERE user_id = ?`,
    [auth.userId]
  );
  return ok({ data: row ? toRoommateProfileDto(row) : null });
});

roommateRoutes.post('/applications', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(
    z.object({
      to_profile_id: z.string().uuid(),
      message: z.string().trim().min(1, 'Introduce yourself.').max(1500),
    }),
    await parseJsonBody(c.req.raw)
  );

  const mine = await queryOne<RoommateProfileRow & { user_id: string }>(
    c.env.DB,
    `SELECT * FROM roommate_profiles WHERE user_id = ?`,
    [auth.userId]
  );
  if (!mine) throw ApiError.conflict('Create your roommate profile before applying.');

  const target = await queryOne<RoommateProfileRow & { user_id: string }>(
    c.env.DB,
    `SELECT * FROM roommate_profiles WHERE id = ?`,
    [body.to_profile_id]
  );
  if (!target) throw ApiError.notFound('That profile');
  if (target.user_id === auth.userId) throw ApiError.badRequest('You cannot apply to yourself.');

  const { score } = computeMatchScore(mine, target);
  const id = crypto.randomUUID();

  await execute(
    c.env.DB,
    `INSERT INTO roommate_applications (id, from_profile_id, to_profile_id, message, status, match_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [id, mine.id, target.id, body.message, score, nowIso(), nowIso()]
  );

  await createNotification(c.env, {
    userId: target.user_id,
    type: 'roommate_application',
    title: 'New roommate request',
    body: body.message.slice(0, 120),
    resourceType: 'roommate_application',
    resourceId: id,
  });

  return created({ data: { id, status: 'pending' as const, match_score: score } });
});

roommateRoutes.get('/applications', async (c: AppContext) => {
  const auth = currentAuth(c);
  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT a.id, a.status, a.message, a.match_score, a.created_at,
            CASE WHEN a.from_profile_id = p.id THEN 'sent' ELSE 'received' END AS direction,
            u.name AS other_name, u.avatar_url AS other_avatar
       FROM roommate_applications a
       JOIN roommate_profiles p ON p.user_id = ?
       JOIN roommate_profiles other ON other.id = CASE WHEN a.from_profile_id = p.id THEN a.to_profile_id ELSE a.from_profile_id END
       JOIN users u ON u.id = other.user_id
      WHERE a.from_profile_id = p.id OR a.to_profile_id = p.id
      ORDER BY a.created_at DESC
      LIMIT 100`,
    [auth.userId]
  );
  return ok({ data: rows });
});

roommateRoutes.patch('/applications/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(z.object({ status: z.enum(['accepted', 'declined']) }), await parseJsonBody(c.req.raw));

  // Only the recipient may decide.
  const row = await queryOne<{ id: string; to_profile_id: string; from_profile_id: string }>(
    c.env.DB,
    `SELECT a.id, a.to_profile_id, a.from_profile_id
       FROM roommate_applications a
       JOIN roommate_profiles p ON p.id = a.to_profile_id
      WHERE a.id = ? AND p.user_id = ?`,
    [id, auth.userId]
  );
  if (!row) throw ApiError.notFound('That request');

  await execute(c.env.DB, `UPDATE roommate_applications SET status = ?, updated_at = ? WHERE id = ?`, [
    body.status,
    nowIso(),
    id,
  ]);

  return ok({ data: { id, status: body.status } });
});
