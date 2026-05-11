
const KEYWORD_MAP = {
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
    'snacks', 'zomato', 'swiggy', 'starbucks', 'kfc', 'mcdonalds', 'burger', 
    'pizza', 'subway', 'dominos', 'eat', 'eat-in', 'takeout', 
    'delivery', 'supermarket', 'chocolate', 'chocolates', 'chips'
  ],
  Drinks: [
    'drinks', 'juice', 'cocktail','mocktail', 'soda', 'beer','wine', 'thumbsup', 'coke', 'pepsi', 'limca', 'milkshake','redbull','energy drink'
  ],
  Cafe: [
    'cafe', 'coffee', 'tea', 'chai', 'starbucks', 'mccafe', 'cafe coffee day', 'ccd', 'blue tokai', 'third wave', 'thirdwave', 'kruti','ice tea','ice coffee', 'cold coffee'
  ],
  Groceries: [
    'bigbasket', 'groceries', 'grocery', 'mart', 'bakery', 'bread', 'biscuits', 'chips', 'eggs', 'milk', 'swiggy instamart', 'zomato blinkit', 'blinkit', 'zepto'
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
    'tata 1mg', 'test', 'blood test', 'diagnostic', 'surgery', 'wellness'
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

const keywordToCategories = {};
for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase().trim();
        if (!keywordToCategories[lowerKeyword]) {
            keywordToCategories[lowerKeyword] = [];
        }
        keywordToCategories[lowerKeyword].push(category);
    }
}

const duplicates = {};
for (const [keyword, categories] of Object.entries(keywordToCategories)) {
    if (categories.length > 1) {
        duplicates[keyword] = categories;
    }
}

console.log(JSON.stringify(duplicates, null, 2));
