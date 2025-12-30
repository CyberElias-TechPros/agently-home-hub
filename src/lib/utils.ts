import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RoommateProfile, RoomAvailability, MortgageCalculator, MortgageResult, AffordabilityCalculator, AffordabilityResult, Property } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateCompatibilityScore(profile: RoommateProfile, room: RoomAvailability): number {
  let score = 0;
  const maxScore = 100;

  // Age compatibility
  const ageDiff = Math.abs(profile.age - ((room.preferences.ageRange.min + room.preferences.ageRange.max) / 2));
  if (ageDiff <= 5) score += 20;
  else if (ageDiff <= 10) score += 10;

  // Smoking preference
  if (profile.preferences.smoking === room.preferences.smoking) score += 15;

  // Pets preference
  if (profile.preferences.pets === room.preferences.pets) score += 15;

  // Budget compatibility
  const avgBudget = (profile.budget.min + profile.budget.max) / 2;
  if (avgBudget >= room.rent * 0.8 && avgBudget <= room.rent * 1.2) score += 20;
  else if (avgBudget >= room.rent * 0.6 && avgBudget <= room.rent * 1.4) score += 10;

  // Cleanliness (assuming higher cleanliness prefers similar)
  const cleanlinessDiff = Math.abs(profile.preferences.cleanliness - 3); // assuming 3 is neutral
  if (cleanlinessDiff <= 1) score += 15;

  // Social level
  const socialDiff = Math.abs(profile.preferences.socialLevel - 3);
  if (socialDiff <= 1) score += 15;

  return Math.min(score, maxScore);
}

export function findMatches(profiles: RoommateProfile[], rooms: RoomAvailability[]): { profile: RoommateProfile; room: RoomAvailability; score: number }[] {
  const matches: { profile: RoommateProfile; room: RoomAvailability; score: number }[] = [];

  profiles.forEach(profile => {
    rooms.forEach(room => {
      const score = calculateCompatibilityScore(profile, room);
      if (score >= 50) { // Minimum threshold
        matches.push({ profile, room, score });
      }
    });
  });

  return matches.sort((a, b) => b.score - a.score);
}

export function calculateMortgagePayment(calculator: MortgageCalculator): MortgageResult {
  const { loanAmount, interestRate, loanTerm, propertyTax, insurance, pmi = 0 } = calculator;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;

  const monthlyPrincipalAndInterest = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  const monthlyPayment = monthlyPrincipalAndInterest + (propertyTax / 12) + (insurance / 12) + pmi;
  const totalPayment = monthlyPayment * numPayments;
  const totalInterest = totalPayment - loanAmount;

  // Simple amortization schedule (first payment)
  const interestPayment = loanAmount * monthlyRate;
  const principalPayment = monthlyPrincipalAndInterest - interestPayment;
  const remainingBalance = loanAmount - principalPayment;

  const amortizationSchedule = [{
    month: 1,
    payment: monthlyPrincipalAndInterest,
    principal: principalPayment,
    interest: interestPayment,
    balance: remainingBalance
  }];

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    amortizationSchedule
  };
}

export function calculateAffordability(calculator: AffordabilityCalculator): AffordabilityResult {
  const { annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, propertyTaxRate, insuranceRate } = calculator;
  const monthlyIncome = annualIncome / 12;
  const maxDTI = 0.43; // 43% debt-to-income ratio
  const maxHousingRatio = 0.28; // 28% for housing

  const maxMonthlyHousing = Math.min(
    monthlyIncome * maxHousingRatio,
    (monthlyIncome * maxDTI) - monthlyDebt
  );

  // Estimate property tax and insurance
  const estimatedPropertyTax = (maxMonthlyHousing * 12 * propertyTaxRate / 100) / 12;
  const estimatedInsurance = (maxMonthlyHousing * 12 * insuranceRate / 100) / 12;

  const maxMonthlyPITI = maxMonthlyHousing - estimatedPropertyTax - estimatedInsurance;

  // Use mortgage formula to find max loan
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;

  const maxLoanAmount = maxMonthlyPITI * (Math.pow(1 + monthlyRate, numPayments) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
  const maxHomePrice = maxLoanAmount + downPayment;

  const debtToIncomeRatio = ((maxMonthlyHousing + monthlyDebt) / monthlyIncome) * 100;

  return {
    maxLoanAmount,
    maxHomePrice,
    monthlyPayment: maxMonthlyHousing,
    debtToIncomeRatio
  };
}

interface ComparableProperty {
  salePrice: number;
  similarity: number;
}

interface MarketTrend {
  trend: 'up' | 'down' | 'stable';
  appreciation: number;
}

interface ValuationFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export function calculatePropertyValuation(property: Property, comparables: ComparableProperty[], marketTrends: MarketTrend[]): {
  avmValue: number;
  confidenceScore: number;
  factors: ValuationFactor[];
} {
  // Simple AVM calculation based on comparables
  const avgComparablePrice = comparables.reduce((sum, comp) => sum + comp.salePrice, 0) / comparables.length;

  // Apply basic adjustments
  let adjustedValue = avgComparablePrice;

  // Size adjustment (assuming 1200 sq ft is baseline)
  const sizeAdjustment = ((property.area - 1200) / 1200) * 0.1; // 10% per size difference
  adjustedValue *= (1 + sizeAdjustment);

  // Location premium (downtown properties get 15% premium)
  if (property.location.city.toLowerCase().includes('downtown') ||
      property.location.city.toLowerCase().includes('san francisco')) {
    adjustedValue *= 1.15;
  }

  // Market trend adjustment
  const recentTrend = marketTrends[0];
  if (recentTrend && recentTrend.trend === 'up') {
    adjustedValue *= (1 + recentTrend.appreciation / 100);
  }

  // Calculate confidence score based on comparable quality
  const avgSimilarity = comparables.reduce((sum, comp) => sum + comp.similarity, 0) / comparables.length;
  const confidenceScore = Math.min(avgSimilarity, 95); // Max 95% confidence

  const factors: ValuationFactor[] = [
    {
      factor: 'Comparable Sales',
      impact: 'neutral',
      weight: 40,
      description: `${comparables.length} comparable properties analyzed`
    },
    {
      factor: 'Property Size',
      impact: property.area > 1200 ? 'positive' : 'negative',
      weight: 20,
      description: `${property.area} sq ft ${property.area > 1200 ? 'above' : 'below'} average`
    },
    {
      factor: 'Location',
      impact: 'positive',
      weight: 25,
      description: 'Prime location with high demand'
    },
    {
      factor: 'Market Trends',
      impact: recentTrend?.trend === 'up' ? 'positive' : 'neutral',
      weight: 15,
      description: `${recentTrend?.appreciation || 0}% annual appreciation`
    }
  ];

  return {
    avmValue: Math.round(adjustedValue),
    confidenceScore,
    factors
  };
}
