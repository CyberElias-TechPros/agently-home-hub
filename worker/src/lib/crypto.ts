/**
 * Password hashing and token primitives built on Web Crypto.
 *
 * bcrypt is not available in the Workers runtime, and PBKDF2-SHA256 with a
 * per-user salt is the strongest KDF the platform provides natively. Every hash
 * is stored in a self-describing `pbkdf2$<iterations>$<salt>$<hash>` format so
 * the cost factor can be raised later without breaking existing passwords.
 */

const PBKDF2_ITERATIONS = 210_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  try {
    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derived = new Uint8Array(
      await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, expected.length * 8)
    );
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Constant-time comparison so verification cannot be probed by response time. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

/* ------------------------------------------------------------------ */
/* Opaque tokens                                                       */
/* ------------------------------------------------------------------ */

/** URL-safe random token suitable for emails and refresh cookies. */
export function generateToken(byteLength = 32): string {
  return toBase64Url(randomBytes(byteLength));
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Only the hash of a token is persisted, so a database leak is not a login. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return toBase64(new Uint8Array(digest));
}

export async function hashRefreshToken(token: string): Promise<string> {
  return hashToken(token);
}

/* ------------------------------------------------------------------ */
/* Password strength                                                   */
/* ------------------------------------------------------------------ */

export interface PasswordAssessment {
  valid: boolean;
  score: number; // 0-4
  problems: string[];
}

/**
 * Password policy (single source of truth — the sign-up form mirrors this).
 *
 * Length is the dominant factor in password strength, so that is what is
 * enforced. Character-composition rules are deliberately NOT required: pushing
 * users towards `Password1!` trades real entropy for the appearance of it
 * (NIST SP 800-63B makes the same recommendation).
 *
 * What is checked:
 *  - length between 10 and 200 characters
 *  - not a repetition of a single character
 *  - does not contain a common word, including common leet substitutions
 */
const COMMON_PASSWORD_PARTS = [
  'password',
  '123456',
  'qwerty',
  'letmein',
  'welcome',
  'agently',
  'iloveyou',
  'admin',
  'monkey',
  'dragon',
];

/** Folds common leet substitutions back to letters so `p4ssw0rd` still matches. */
function deLeet(value: string): string {
  return value
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'l')
    .replace(/[3€]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b');
}

export function assessPassword(password: string): PasswordAssessment {
  const problems: string[] = [];
  if (password.length < 10) problems.push('Use at least 10 characters.');
  if (password.length > 200) problems.push('Passwords longer than 200 characters are not supported.');
  if (/\s{2,}/.test(password)) problems.push('Avoid repeated spaces.');
  if (/^(.)\1+$/.test(password)) problems.push('Avoid repeating a single character.');

  // Checked against both the raw and the de-leeted form.
  const candidates = [password.toLowerCase(), deLeet(password)];
  if (COMMON_PASSWORD_PARTS.some((entry) => candidates.some((candidate) => candidate.includes(entry)))) {
    problems.push('Avoid common words such as "password".');
  }

  let variety = 0;
  if (/[a-z]/.test(password)) variety += 1;
  if (/[A-Z]/.test(password)) variety += 1;
  if (/[0-9]/.test(password)) variety += 1;
  if (/[^A-Za-z0-9]/.test(password)) variety += 1;

  const score = Math.max(0, Math.min(4, Math.floor(password.length / 6) + variety - 1));
  return { valid: problems.length === 0, score, problems };
}
