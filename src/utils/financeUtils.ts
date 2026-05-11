/**
 * Financial utilities for Fixed Flow Cards
 */

/**
 * Calculates the Total Interest % for a Flat interest loan/EMI.
 * (Total EMI * Tenure - Principal) / Principal * 100
 */
export const calculateTotalInterestPercent = (
  principal: number,
  emi: number,
  tenureMonths: number
): number => {
  if (principal <= 0) return 0;
  const totalRepayment = emi * tenureMonths;
  const totalInterest = totalRepayment - principal;
  return Math.round((totalInterest / principal) * 100);
};

/**
 * Solves for the Annual ROI (%) from EMI, Principal, and Tenure 
 * using Binary Search to solve the EMI formula:
 * E = [P * r * (1+r)^n] / [(1+r)^n - 1]
 * 
 * @param principal (P)
 * @param emi (E)
 * @param tenureMonths (n)
 * @returns Annual ROI (%)
 */
export const calculateROI = (
  principal: number,
  emi: number,
  tenureMonths: number
): number => {
  if (principal <= 0 || emi <= 0 || tenureMonths <= 0) return 0;
  if (emi * tenureMonths <= principal) return 0; // No interest

  let low = 0;
  let high = 100; // 100% per month is a safe upper bound for binary search
  let mid = 0;
  const precision = 0.0001;

  // We are searching for 'r' (monthly interest rate)
  while (high - low > precision) {
    mid = (low + high) / 2;
    const r = mid / 100;
    
    // Standard EMI formula: E = P * r * (1+r)^n / ((1+r)^n - 1)
    const calculatedEmi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
    
    if (calculatedEmi > emi) {
      high = mid;
    } else {
      low = mid;
    }
  }

  // mid is the monthly rate in %. Convert to annual ROI %.
  return Math.round(mid * 12 * 10) / 10; // 1 decimal place accuracy
};
