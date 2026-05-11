/**
 * Map of categories to keywords for auto-categorization
 */
export const KEYWORD_MAP: Record<string, string[]> = {
  Fuel: [
    'fuel', 'petrol', 'diesel', 'gas', 'cng'
  ],
  Traveling: [
    'uber', 'ola', 'taxi', 
    'rickshaw', 'auto', 'train', 'flight', 'bus', 'travel', 'commute', 
    'rapido', 'redbus', 'irctc', 'indigo', 'airindia', 'air india', 'airplane', 
    'airport', 'parking', 'garage', 'mechanic', 'bike service', 'bike', 'car'
  ],
  Meals: [
    'food', 'restaurant', 'dinner', 'lunch', 'breakfast', 
    'snacks', 'zomato', 'swiggy', 'kfc', 'mcdonalds', 'burger', 
    'pizza', 'subway', 'dominos', 'eat', 'eat-in', 'takeout', 
    'delivery', 'supermarket', 'chocolate', 'chocolates'
  ],
  Drinks: [
    'drinks', 'juice', 'cocktail','mocktail', 'soda', 'beer','wine', 'thumbsup', 'coke', 'pepsi', 'limca', 'milkshake','redbull','energy drink'
  ],
  Cafe: [
    'cafe', 'coffee', 'tea', 'chai', 'starbucks', 'mccafe', 'cafe coffee day', 'ccd', 'blue tokai', 'third wave', 'thirdwave', 'kruti','ice tea','ice coffee', 'cold coffee'
  ],
  Groceries: [
    'bigbasket', 'groceries', 'grocery', 'mart', 'bakery', 'bread', 'biscuits', 'chips', 'eggs', 'milk', 'instamart', 'blinkit', 'zepto'
  ],
  Shopping: [
    'shopping', 'amazon', 'flipkart', 'meesho', 'myntra', 'speakers', 
    'phone', 'gadgets', 'electronics', 'clothes', 'gift', 'mall', 'store', 
    'pantaloons', 'h&m', 'zara', 'laptop', 'headphones', 'monitor', 
    'mouse', 'keyboard', 'device', 'shoes', 'fashion'
  ],
  Medical: [
    'doctor', 'hospital', 'medicine', 'pharma', 'pharmacy', 'health', 
    'clinic', 'checkup', 'dentist', 'vitamins', '1mg', 'netmeds', 'apollo', 
    'test', 'blood test', 'diagnostic', 'surgery', 'wellness'
  ],
  Sports: [
    'football', 'turf', 'gym', 'workout', 'fitness', 'cricket', 'badminton', 
    'sports', 'marathon', 'club', 'cult', 'fit', 'play', 'match', 'stadium', 
    'yoga', 'swimming', 'trainer'
  ],
  Income: [
    'salary', 'bonus', 'dividend', 'interest', 'refund', 'cashback', 
    'payment', 'receive', 'credit', 'freelance', 'upi receive', 'income', 
    'transfer in', 'deposit'
  ],
  Vacation: [
    'hotel', 'resort', 'airbnb', 'stay', 'vacation', 'holiday', 'trip', 
    'tickets', 'sightseeing', 'makemytrip', 'goibibo', 'booking.com', 
    'expedia', 'travel insurance', 'passport', 'visa'
  ],
  Utility: [
    'rent', 'bill', 'utility', 'electricity', 'water', 'wifi', 'internet', 
    'broadband', 'jio', 'airtel', 'vi', 'gas bill', 'maintenance', 
    'netflix', 'spotify', 'subscription', 'youtube', 'recharge', 'phone bill'
  ]
};

/**
 * Normalizes string and extracts category based on keywords
 */
export const getCategoryFromTitle = (title: string): string => {
  if (!title) return 'Other';
  
  const normalizedTitle = title.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      return regex.test(normalizedTitle);
    })) {
      return category;
    }
  }

  return 'Other';
};

/**
 * Returns a consolidated category for multi-keyword descriptions.
 * If all keywords map to the same category, returns that category.
 * If keywords map to different categories, returns 'Other'.
 */
export const getConsolidatedCategory = (title: string): string => {
  if (!title) return 'Other';
  
  const normalizedTitle = title.toLowerCase();
  const matchedCategories = new Set<string>();

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      return regex.test(normalizedTitle);
    })) {
      matchedCategories.add(category);
    }
  }

  if (matchedCategories.size === 1) {
    return Array.from(matchedCategories)[0];
  }

  return 'Other';
};
