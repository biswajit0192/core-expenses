/**
 * Financial utilities for loan calculations (Flat and Reducing Balance)
 */

/**
 * Calculates Annual Flat Interest Rate based on Loan parameters
 */
export const calculateFlatRate = (principal: number, emi: number, months: number): number => {
  if (!principal || !emi || !months) return 0;
  const totalPaid = emi * months;
  const totalInterest = totalPaid - principal;
  if (totalInterest <= 0) return 0;
  
  // (Total Interest / Principal / Years) * 100
  const years = months / 12;
  return (totalInterest / principal / years) * 100;
};

/**
 * Calculates Tenure (Months) based on Principal, EMI, and Flat Rate
 */
export const calculateFlatTenure = (principal: number, emi: number, annualRate: number): number => {
  if (!principal || !emi || annualRate === undefined) return 0;
  
  // Total Interest = Principal * Rate * Years
  // Total Paid = Principal + Total Interest
  // EMI = Total Paid / Months
  // Solve for months:
  // EMI * Months = Principal + (Principal * (annualRate/100) * (Months/12))
  // EMI * Months - (Principal * annualRate / 1200) * Months = Principal
  // Months * (EMI - (Principal * annualRate / 1200)) = Principal
  // Months = Principal / (EMI - (Principal * annualRate / 1200))
  
  const monthlyRateAdjustment = (principal * annualRate) / 1200;
  const denominator = emi - monthlyRateAdjustment;
  
  if (denominator <= 0) return 0; // EMI too low to cover interest
  return Math.ceil(principal / denominator);
};

/**
 * Solves for Annual Reducing Interest Rate using Newton's Method
 * Formula: EMI = [P * r * (1 + r)^n] / [((1 + r)^n) - 1]
 */
export const solveReducingRate = (principal: number, emi: number, months: number): number => {
  if (!principal || !emi || !months || emi <= principal / months) return 0;

  let r = 0.001; // Initial guess (monthly rate)
  const precision = 0.000001;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const powN = Math.pow(1 + r, months);
    const f = (principal * r * powN) / (powN - 1) - emi;
    const fDash = (principal * (powN * (powN - 1 - r * months)) / Math.pow(powN - 1, 2));
    
    if (fDash === 0) break;
    
    const nextR = r - f / fDash;
    if (Math.abs(nextR - r) < precision) {
      return nextR * 12 * 100; // Return annual percentage
    }
    r = nextR;
  }

  return r * 12 * 100;
};

/**
 * Calculates Tenure (Months) for Reducing Balance
 * n = log(EMI / (EMI - P * r)) / log(1 + r)
 */
export const calculateReducingTenure = (principal: number, emi: number, annualRate: number): number => {
  if (!principal || !emi || !annualRate) return 0;
  const r = (annualRate / 100) / 12;
  
  if (emi <= principal * r) return 0; // EMI must be > interest growth

  const n = Math.log(emi / (emi - principal * r)) / Math.log(1 + r);
  return Math.ceil(n);
};
