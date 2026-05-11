/**
 * Date utilities for Flow Timelines
 */

/**
 * Returns the ordinal suffix for a number (e.g. 1st, 2nd, 3rd, 4th)
 */
export const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

/**
 * Formats a date string into "5th Mar, 2026"
 */
export const formatDateWithOrdinal = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();

  return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
};

/**
 * Adds a specific number of months to a date string
 */
export const addMonths = (dateString: string, months: number): string => {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
};

/**
 * Calculates days remaining until a target date
 */
export const getDaysUntil = (dateString: string): number => {
  const target = new Date(dateString);
  const now = new Date();
  
  // Set times to midnight for day-accurate calculation
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculates current installment progress based on Start Date and Total Tenure
 */
export const calculateTenureProgress = (startDateString: string, totalMonths: number): number => {
  const start = new Date(startDateString);
  const now = new Date();
  
  // Future check: If first installment hasn't started yet
  if (start > now) return 0;

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const elapsed = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
  
  // Clamp between 0 and totalMonths
  return Math.max(0, Math.min(totalMonths, elapsed));
};

/**
 * Returns an array of YYYY-MM keys between two dates (inclusive of months).
 * Logic:
 * - Past months are always included.
 * - The 'endDate' month is ONLY included if start date day <= end date day.
 */
export const getMonthKeysInRange = (startDateString: string, endDateString: string): string[] => {
  const start = new Date(startDateString);
  const end = new Date(endDateString);
  
  // Guard for future start months
  const startMonthRef = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonthRef = new Date(end.getFullYear(), end.getMonth(), 1);
  if (startMonthRef > endMonthRef) {
    return [];
  }

  const keys: string[] = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endLimit) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;

    if (year === end.getFullYear() && current.getMonth() === end.getMonth()) {
      // CURRENT MONTH RULE:
      // Only mark paid for April if start date day (e.g. 14th) <= Today day (14th)
      if (start.getDate() <= end.getDate()) {
        keys.push(key);
      }
    } else {
      // Full past month: Always mark as paid in history
      keys.push(key);
    }

    current.setMonth(current.getMonth() + 1);
  }

  return keys;
};

/**
 * Calculates the next logical display date for a recurring bill.
 * Rule:
 * - If UNPAID for current month: Display current month occurrence (even if past/future).
 * - If PAID for current month: Display following month occurrence.
 */
export const calculateNextDisplayDate = (baseDateString: string, paidMonths: string[]): string => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  let date = new Date(baseDateString);

  // 1. Roll forward if baseDate is from a stale past month
  while (date.getFullYear() < currentYear || (date.getFullYear() === currentYear && date.getMonth() < currentMonth)) {
    date.setMonth(date.getMonth() + 1);
  }

  // 2. DISPLAY RULE:
  // If the current month is already in paidMonths, roll exactly one month forward to the next cycle.
  const isPaid = (paidMonths || []).includes(monthKey);
  if (isPaid) {
    const dateMonth = date.getMonth();
    const dateYear = date.getFullYear();
    
    // Check if the rolled date points to the current month before rolling forward
    if (dateMonth === currentMonth && dateYear === currentYear) {
      date.setMonth(date.getMonth() + 1);
    }
  }

  return date.toISOString();
};
