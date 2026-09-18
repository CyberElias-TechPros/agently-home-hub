/**
 * Support, payments & calculator routes (mortgage, affordability, insights),
 * plus public meta endpoints (users lookup for messaging, health).
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ApiError } from '../errors';
import { uuid, nowIso } from '../crypto';
import { requireAuth, currentUserId } from '../middleware';

type Ctx = { Bindings: Env; Variables: Variables };

export const misc = new Hono<Ctx>();

// ---------------------------------------------------------------------------
// POST /api/contact
// ---------------------------------------------------------------------------
misc.post('/contact', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!name) throw ApiError.badRequest('Name is required');
  if (!email.includes('@')) throw ApiError.badRequest('A valid email is required');
  if (message.length < 10) throw ApiError.badRequest('Message must be at least 10 characters');

  let userId: string | null = null;
  try {
    if (body.userId) userId = body.userId;
  } catch { /* non-string/null is fine */ }

  const contactId = uuid();
  await c.env.DB.prepare(
    `INSERT INTO contact_submissions (id, user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(contactId, userId, name, email, typeof body.subject === 'string' ? body.subject : '', message).run();

  return c.json({
    success: true,
    data: { id: contactId, message: "Thanks for reaching out — the Agently team will be in touch shortly." },
  }, 201);
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
misc.get('/payments', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
  ).bind(currentUserId(c)).all();
  return c.json({ success: true, data: rows.results });
});

// ---------------------------------------------------------------------------
// Mortgage calculation (pure function, no DB)
// ---------------------------------------------------------------------------
function calculateMortgage(p: {
  loanAmount: number; interestRate: number; loanTerm: number;
  propertyTax?: number; insurance?: number; pmi?: number;
}) {
  const { loanAmount, interestRate, loanTerm, propertyTax = 0, insurance = 0, pmi = 0 } = p;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  if (monthlyRate === 0) {
    const monthlyPAndI = loanAmount / numPayments;
    return {
      monthlyPayment: monthlyPAndI + propertyTax / 12 + insurance / 12 + pmi,
      totalPayment: loanAmount + propertyTax * loanTerm + insurance * loanTerm + pmi * numPayments,
      totalInterest: 0,
      monthlyPrincipalInterest: monthlyPAndI,
    };
  }
  const monthlyPAndI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const monthlyPayment = monthlyPAndI + propertyTax / 12 + insurance / 12 + pmi;
  const totalPayment = monthlyPayment * numPayments;
  const totalInterest = (monthlyPAndI * numPayments) - loanAmount;
  return { monthlyPayment, totalPayment, totalInterest, monthlyPrincipalInterest: monthlyPAndI };
}

function calculateAffordability(p: {
  annualIncome: number; monthlyDebt?: number; downPayment?: number;
  interestRate?: number; loanTerm?: number; propertyTaxRate?: number; insuranceRate?: number;
}) {
  const { annualIncome, monthlyDebt = 0, downPayment = 0, interestRate = 6.5, loanTerm = 30,
    propertyTaxRate = 1.2, insuranceRate = 0.5 } = p;
  const monthlyIncome = annualIncome / 12;
  const maxHousingRatio = 0.28;
  const maxDTI = 0.43;
  const maxMonthlyHousing = Math.min(monthlyIncome * maxHousingRatio, monthlyIncome * maxDTI - monthlyDebt);
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  const insuranceMonthly = (monthlyIncome * 12 * insuranceRate / 100) / 12;
  const propertyTaxMonthly = (monthlyIncome * 12 * propertyTaxRate / 100) / 12;
  const maxPAndI = Math.max(0, maxMonthlyHousing - insuranceMonthly - propertyTaxMonthly);
  const maxLoanAmount = monthlyRate === 0
    ? maxPAndI * numPayments
    : maxPAndI * (Math.pow(1 + monthlyRate, numPayments) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
  const maxHomePrice = maxLoanAmount + downPayment;
  const debtToIncomeRatio = ((maxMonthlyHousing + monthlyDebt) / monthlyIncome) * 100;
  return { maxLoanAmount, maxHomePrice, monthlyPayment: maxMonthlyHousing, debtToIncomeRatio };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

misc.post('/mortgage/calculate', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const loanAmount = num(b.loanAmount, NaN);
  const interestRate = num(b.interestRate, NaN);
  const loanTerm = num(b.loanTerm, NaN);
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) throw ApiError.badRequest('loanAmount is required');
  if (!Number.isFinite(interestRate) || interestRate < 0) throw ApiError.badRequest('interestRate is required');
  if (!Number.isFinite(loanTerm) || loanTerm <= 0) throw ApiError.badRequest('loanTerm is required');
  const result = calculateMortgage({
    loanAmount, interestRate, loanTerm,
    propertyTax: num(b.propertyTax, 0), insurance: num(b.insurance, 0), pmi: num(b.pmi, 0),
  });
  return c.json({ success: true, data: result });
});

misc.post('/mortgage/affordability', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const annualIncome = num(b.annualIncome, NaN);
  if (!Number.isFinite(annualIncome) || annualIncome <= 0) throw ApiError.badRequest('annualIncome is required');
  const result = calculateAffordability({
    annualIncome,
    monthlyDebt: num(b.monthlyDebt, 0),
    downPayment: num(b.downPayment, 0),
    interestRate: num(b.interestRate, 6.5),
    loanTerm: num(b.loanTerm, 30),
    propertyTaxRate: num(b.propertyTaxRate, 1.2),
    insuranceRate: num(b.insuranceRate, 0.5),
  });
  return c.json({ success: true, data: result });
});

misc.get('/mortgage/rates', (c) => {
  const rates = [
    { lender: 'Agently Prime', rate: 6.25, apr: 6.45, term: 30, points: 0.5, fees: 2500, description: 'Standard 30-year fixed' },
    { lender: 'Agently Flex', rate: 6.1, apr: 6.3, term: 15, points: 0.75, fees: 2800, description: '15-year fixed, lower total interest' },
    { lender: 'Agently Starter', rate: 6.5, apr: 6.7, term: 30, points: 0, fees: 1500, description: 'First-time buyer friendly' },
  ];
  return c.json({ success: true, data: rates, meta: { updatedAt: nowIso() } });
});

// ---------------------------------------------------------------------------
// Neighborhood insights (deterministic pseudo-analytics per neighborhood)
// ---------------------------------------------------------------------------
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

misc.get('/neighborhood/:slug', (c) => {
  const slug = c.req.param('slug');
  const h = hashString(slug);
  const safetyScore = 60 + (h % 40);          // 60–99
  const walkScore = 55 + ((h >> 3) % 45);     // 55–99
  const transitScore = 50 + ((h >> 5) % 45);
  const schoolRating = 4 + ((h >> 7) % 7);    // 4–10
  return c.json({
    success: true,
    data: {
      neighborhood: slug,
      scores: {
        safety: safetyScore,
        walkability: walkScore,
        transit: transitScore,
        schoolRating: schoolRating / 10,
      },
      amenities: {
        grocery: (h >> 2) % 14,
        restaurants: 10 + ((h >> 4) % 30),
        parks: (h >> 6) % 10,
        schools: (h >> 8) % 8,
        hospitals: 1 + ((h >> 9) % 4),
      },
      summary: `${slug} scores ${safetyScore}/100 for safety and ${walkScore}/100 for walkability on the Agently livability index.`,
      updatedAt: nowIso(),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/users/:id/public  (for "message the landlord" flows)
// ---------------------------------------------------------------------------
misc.get('/users/:id/public', async (c) => {
  const row = await c.env.DB.prepare(
    'SELECT id, name, role, verified, trust_score FROM users WHERE id = ?',
  ).bind(c.req.param('id')).first();
  if (!row) throw ApiError.notFound('User not found');
  return c.json({
    success: true,
    data: { id: row.id, name: row.name, role: row.role, verified: row.verified === 1, trustScore: row.trust_score },
  });
});
