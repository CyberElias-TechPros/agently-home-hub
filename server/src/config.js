// Config loader — minimal, side-effect free, Worker compatible.
// Node loads a `.env` file if present; Workers get vars from bindings/`env`.

const isNodeRuntime = typeof process !== 'undefined' && !!process.versions?.node;

function envValue(key, fallback = '') {
  // Cloudflare Workers: secrets surface as globalThis[key] (vars) — but our
  // Worker entry (worker.js) copies them into globalThis.env instead. The
  // Node path reads process.env. Try both, plus `.env` lines already merged.
  const candidates = [
    isNodeRuntime ? process.env[key] : undefined,
    globalThis.__agentlyEnv ? globalThis.__agentlyEnv[key] : undefined,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }
  return fallback;
}

export function boolEnv(key, fallback = false) {
  const v = envValue(key);
  if (v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

export function intEnv(key, fallback) {
  const v = envValue(key);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Resolve origin allow-list. Returns either '*' or an array of strings.
export function allowedOrigins() {
  const raw = envValue('ALLOWED_ORIGINS', '*');
  if (!raw || raw.trim() === '*' || raw.trim() === '') return '*';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function originAllowed(origin) {
  const allow = allowedOrigins();
  if (allow === '*') return true;
  if (!origin) return false;
  return allow.includes(origin);
}

const config = {
  isNodeRuntime,
  port: intEnv('PORT', 3001),
  host: envValue('HOST', '0.0.0.0'),
  nodeEnv: envValue('NODE_ENV', 'development'),
  isProduction: envValue('NODE_ENV', 'development') === 'production',
  databasePath: envValue('DATABASE_PATH', './data/agently.db'),
  jwtSecret: envValue('JWT_SECRET', 'agently-dev-secret-do-not-use-in-prod'),
  jwtRefreshSecret: envValue(
    'JWT_REFRESH_SECRET',
    'agently-dev-refresh-secret-do-not-use-in-prod'
  ),
  jwtAccessTtl: envValue('JWT_ACCESS_TTL', '1h'),
  jwtRefreshTtlDays: intEnv('JWT_REFRESH_TTL_DAYS', 7),
  paystackEnabled: boolEnv('PAYSTACK_ENABLED', false),
  paystackSecretKey: envValue('PAYSTACK_SECRET_KEY', ''),
  paystackPublicKey: envValue('PAYSTACK_PUBLIC_KEY', ''),
  paystackBaseUrl: envValue('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
  bookingFeeNgn: intEnv('BOOKING_FEE_NGN', 0),
  smtpHost: envValue('SMTP_HOST', ''),
  smtpPort: intEnv('SMTP_PORT', 587),
  smtpUser: envValue('SMTP_USER', ''),
  smtpPass: envValue('SMTP_PASS', ''),
  mailFrom: envValue('MAIL_FROM', 'Agently <no-reply@agently.app>'),
  frontendUrl: envValue('FRONTEND_URL', 'http://localhost:5173'),
};

export default config;
