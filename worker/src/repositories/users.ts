import { nowIso, queryAll, queryOne } from './db';
import type { UserRole } from '../domain/roles';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  verified: number;
  disabled_at: string | null;
  last_login_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

const PUBLIC_COLUMNS = `id, name, email, role, phone, avatar_url, verified, created_at, updated_at`;
const ADMIN_COLUMNS = `${PUBLIC_COLUMNS}, last_login_at, disabled_at`;

export type PublicUser = Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'phone' | 'avatar_url' | 'verified' | 'created_at' | 'updated_at'>;
export type AdminUserRow = PublicUser & { last_login_at: string | null; disabled_at: string | null };

export const users = {
  byId: (db: D1Database, id: string) => queryOne<UserRow>(db, `SELECT * FROM users WHERE id = ?`, [id]),

  publicById: (db: D1Database, id: string) =>
    queryOne<PublicUser>(db, `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]),

  /** Email is stored lowercased so lookups are case-insensitive by construction. */
  byEmail: (db: D1Database, email: string) =>
    queryOne<UserRow>(db, `SELECT * FROM users WHERE lower(email) = lower(?)`, [email]),

  adminList: (db: D1Database, options: { role?: string; q?: string; limit: number; offset: number }) => {
    const where: string[] = [];
    const params: unknown[] = [];
    if (options.role) {
      where.push('role = ?');
      params.push(options.role);
    }
    if (options.q) {
      where.push('(lower(name) LIKE lower(?) OR lower(email) LIKE lower(?))');
      const needle = `%${options.q}%`;
      params.push(needle, needle);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return queryAll<AdminUserRow>(
      db,
      `SELECT ${ADMIN_COLUMNS} FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, options.limit, options.offset]
    );
  },

  count: (db: D1Database, options: { role?: string; q?: string } = {}) => {
    const where: string[] = [];
    const params: unknown[] = [];
    if (options.role) {
      where.push('role = ?');
      params.push(options.role);
    }
    if (options.q) {
      where.push('(lower(name) LIKE lower(?) OR lower(email) LIKE lower(?))');
      const needle = `%${options.q}%`;
      params.push(needle, needle);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return queryOne<{ count: number }>(db, `SELECT COUNT(*) as count FROM users ${whereSql}`, params);
  },

  countByRole: async (db: D1Database): Promise<Record<string, number>> => {
    const rows = await queryAll<{ role: string; count: number }>(
      db,
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );
    return Object.fromEntries(rows.map((row) => [row.role, row.count]));
  },

  countSince: (db: D1Database, isoDate: string) =>
    queryOne<{ count: number }>(db, `SELECT COUNT(*) as count FROM users WHERE created_at >= ?`, [isoDate]),

  recordFailedLogin: (db: D1Database, id: string, lockedUntil: string | null) =>
    queryAll(
      db,
      `UPDATE users
          SET failed_login_attempts = failed_login_attempts + 1,
              locked_until = ?,
              updated_at = ?
        WHERE id = ?`,
      [lockedUntil, nowIso(), id]
    ),

  recordSuccessfulLogin: (db: D1Database, id: string) =>
    queryAll(
      db,
      `UPDATE users
          SET failed_login_attempts = 0,
              locked_until = NULL,
              last_login_at = ?,
              updated_at = ?
        WHERE id = ?`,
      [nowIso(), nowIso(), id]
    ),

  markVerified: (db: D1Database, id: string) =>
    queryAll(db, `UPDATE users SET verified = 1, updated_at = ? WHERE id = ?`, [nowIso(), id]),

  setRole: (db: D1Database, id: string, role: UserRole) =>
    queryAll(db, `UPDATE users SET role = ?, updated_at = ? WHERE id = ?`, [role, nowIso(), id]),

  setDisabled: (db: D1Database, id: string, disabled: boolean) =>
    queryAll(db, `UPDATE users SET disabled_at = ?, updated_at = ? WHERE id = ?`, [
      disabled ? nowIso() : null,
      nowIso(),
      id,
    ]),

  updateProfile: (db: D1Database, id: string, patch: { name?: string; phone?: string | null; avatar_url?: string | null }) => {
    const columns: string[] = [];
    const params: unknown[] = [];
    for (const [column, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      columns.push(`${column} = ?`);
      params.push(value);
    }
    if (columns.length === 0) return Promise.resolve([]);
    columns.push('updated_at = ?');
    params.push(nowIso(), id);
    return queryAll(db, `UPDATE users SET ${columns.join(', ')} WHERE id = ?`, params);
  },

  countAll: (db: D1Database) => queryOne<{ count: number }>(db, `SELECT COUNT(*) as count FROM users`),
};
