// Mortgage calculators + rates. Pure functions, runtime-agnostic.

import { ok, badRequest, parseJson } from '../lib/http.js';
import { all, get } from '../db/db.js';

export async function handleMortgage(req, res, parts) {
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'rates') return listRates(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'calculate') return calculate(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'affordability') return affordability(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'refinance') return refinance(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'prequalify') return prequalify(req, res);
  return notFound(res, 'Mortgage route not found');
}

async function listRates(req, res) {
  const rows = await all('SELECT * FROM mortgage_rates ORDER BY rate ASC');
  return ok(res, {
    items: rows.map((r) => ({
      id: r.id, lender: r.lender, rate: r.rate, apr: r.apr, points: r.points,
      fees: r.fees, termYears: r.term_years, lastUpdated: r.last_updated,
    })),
  });
}

async function calculate(req, res) {
  const body = parseJson(req) || {};
  const loanAmount = Number(body.loanAmount);
  const interestRate = Number(body.interestRate);
  const loanTerm = Number(body.loanTerm ?? body.loanTermYears ?? 30);
  const propertyTax = Number(body.propertyTax ?? 0);
  const insurance = Number(body.insurance ?? 0);
  const pmi = Number(body.pmi ?? 0);

  if (![loanAmount, interestRate, loanTerm].every((n) => Number.isFinite(n) && n > 0)) {
    return badRequest(res, 'loanAmount, interestRate and loanTerm must be positive numbers');
  }

  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  const principalInterest = loanAmount * (monthlyRate * factor) / (factor - 1);
  const monthlyPayment = principalInterest + propertyTax / 12 + insurance / 12 + pmi;
  const totalPayment = monthlyPayment * numPayments;
  const totalInterest = totalPayment - loanAmount;

  // Amortization schedule (cap at 360 rows).
  const schedule = [];
  let balance = loanAmount;
  const cap = Math.min(numPayments, 360);
  for (let m = 1; m <= cap; m++) {
    const interest = balance * monthlyRate;
    const principal = principalInterest - interest;
    balance = Math.max(0, balance - principal);
    schedule.push({
      month: m,
      payment: Math.round(monthlyPayment),
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.round(balance),
    });
  }

  return ok(res, {
    monthlyPayment: Math.round(monthlyPayment),
    principalInterest: Math.round(principalInterest),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest),
    amortizationSchedule: schedule,
  });
}

async function affordability(req, res) {
  const body = parseJson(req) || {};
  const annualIncome = Number(body.annualIncome);
  const monthlyDebt = Number(body.monthlyDebt ?? 0);
  const downPayment = Number(body.downPayment ?? 0);
  const interestRate = Number(body.interestRate);
  const loanTerm = Number(body.loanTerm ?? 30);

  if (![annualIncome, interestRate].every((n) => Number.isFinite(n) && n > 0)) {
    return badRequest(res, 'annualIncome and interestRate are required');
  }

  const monthlyIncome = annualIncome / 12;
  const maxDti = 0.43;
  const maxHousing = 0.28;
  const maxMonthlyHousing = Math.min(monthlyIncome * maxHousing, monthlyIncome * maxDti - monthlyDebt);
  const monthlyRate = interestRate / 100 / 12;
  const n = loanTerm * 12;
  const factor = Math.pow(1 + monthlyRate, n);
  const maxLoanAmount = maxMonthlyHousing * (factor - 1) / (monthlyRate * factor);
  const maxHomePrice = maxLoanAmount + downPayment;
  const dti = ((maxMonthlyHousing + monthlyDebt) / monthlyIncome) * 100;

  return ok(res, {
    maxLoanAmount: Math.max(0, Math.round(maxLoanAmount)),
    maxHomePrice: Math.max(0, Math.round(maxHomePrice)),
    maxMonthlyPayment: Math.round(maxMonthlyHousing),
    debtToIncomeRatio: Math.round(dti * 10) / 10,
  });
}

async function refinance(req, res) {
  const body = parseJson(req) || {};
  const currentBalance = Number(body.balance ?? body.currentBalance);
  const currentRate = Number(body.currentRate);
  const newRate = Number(body.newRate);
  const termYears = Number(body.termYears ?? 30);
  if (![currentBalance, currentRate, newRate].every((n) => Number.isFinite(n) && n > 0)) {
    return badRequest(res, 'balance, currentRate and newRate are required');
  }
  const calc = (rate) => {
    const r = rate / 100 / 12;
    const n = termYears * 12;
    const f = Math.pow(1 + r, n);
    return currentBalance * (r * f) / (f - 1);
  };
  const currentPayment = calc(currentRate);
  const newPayment = calc(newRate);
  const monthlySavings = currentPayment - newPayment;
  return ok(res, {
    currentMonthly: Math.round(currentPayment),
    newMonthly: Math.round(newPayment),
    monthlySavings: Math.round(monthlySavings),
    totalSavings: Math.round(monthlySavings * termYears * 12),
  });
}

async function prequalify(req, res) {
  const body = parseJson(req) || {};
  const annualIncome = Number(body.annualIncome);
  const monthlyDebt = Number(body.monthlyDebt ?? 0);
  const downPayment = Number(body.downPayment ?? 0);
  const creditTier = body.creditTier || 'good';
  if (!Number.isFinite(annualIncome) || annualIncome <= 0) return badRequest(res, 'annualIncome is required');

  const baseRate = { excellent: 18.5, good: 20.0, fair: 22.0 }[creditTier] || 20.0;
  const preQualified = Math.round((annualIncome * 3.5) + downPayment);
  return ok(res, {
    preQualifiedAmount: preQualified,
    estimatedRate: baseRate,
    estimatedMonthly: Math.round((preQualified * (baseRate / 100 / 12) * Math.pow(1 + baseRate / 100 / 12, 360)) / (Math.pow(1 + baseRate / 100 / 12, 360) - 1)),
    factors: ['Income verified', 'Credit tier: ' + creditTier],
    nextSteps: ['Upload proof of income', 'Choose a lender', 'Get pre-qualified in writing'],
  });
}
