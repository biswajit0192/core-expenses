export function extractDateFromText(text: string): Date | null {
  const lowercaseText = text.toLowerCase();
  const now = new Date();

  // Handle "tomorrow"
  if (lowercaseText.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow;
  }

  // Handle "next week"
  if (lowercaseText.includes('next week')) {
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    return nextWeek;
  }

  // Handle formats like "2nd April", "15th May", "April 2nd"
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbrev = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  for (let i = 0; i < 12; i++) {
    const monthName = months[i];
    const monthShort = monthAbbrev[i];
    
    // Pattern: [Day] [Month] or [Month] [Day]
    const regex1 = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthName}`, 'i');
    const regex2 = new RegExp(`${monthName}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
    const regex3 = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthShort}`, 'i');
    const regex4 = new RegExp(`${monthShort}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');

    const match = text.match(regex1) || text.match(regex2) || text.match(regex3) || text.match(regex4);
    
    if (match) {
      const day = parseInt(match[1]);
      const year = now.getFullYear();
      const date = new Date(year, i, day);
      
      // If the date has already passed this year, assume next year
      if (date < now) {
        date.setFullYear(year + 1);
      }
      return date;
    }
  }

  return null;
}

/**
 * Resolves relative date keywords (today, yesterday, days of week)
 */
export function getRelativeDate(text: string): Date | null {
  const lower = text.toLowerCase();
  const now = new Date();
  
  if (lower.includes('today')) return now;
  
  if (lower.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    return yesterday;
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < 7; i++) {
    if (lower.includes(days[i])) {
      const targetDay = i;
      const currentDay = now.getDay();
      let diff = currentDay - targetDay;
      
      // If today is targetDay, or targetDay was earlier this week, diff is 0 or positive
      // If targetDay is "later" in the week, it means we refer to "Last [Day]"
      if (diff <= 0) diff += 7;
      
      const result = new Date();
      result.setDate(now.getDate() - diff);
      return result;
    }
  }

  return null;
}
