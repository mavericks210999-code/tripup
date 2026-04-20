const CURRENCY_MAP: { symbol: string; code: string; keywords: string[] }[] = [
  { symbol: '€', code: 'EUR', keywords: ['paris', 'france', 'lisbon', 'portugal', 'barcelona', 'spain', 'madrid', 'rome', 'italy', 'amsterdam', 'netherlands', 'berlin', 'germany', 'athens', 'greece', 'vienna', 'austria', 'prague', 'czech', 'budapest', 'hungary', 'europe', 'brussels', 'belgium', 'dublin', 'ireland', 'finland', 'oslo', 'stockholm', 'milan', 'venice', 'florence'] },
  { symbol: '$', code: 'USD', keywords: ['new york', 'los angeles', 'miami', 'chicago', 'san francisco', 'las vegas', 'hawaii', 'boston', 'seattle', 'usa', 'united states', 'america', 'washington'] },
  { symbol: '£', code: 'GBP', keywords: ['london', 'uk', 'england', 'britain', 'scotland', 'edinburgh', 'manchester', 'liverpool', 'oxford', 'cambridge', 'united kingdom'] },
  { symbol: '¥', code: 'JPY', keywords: ['tokyo', 'osaka', 'kyoto', 'japan', 'hiroshima', 'nara', 'sapporo', 'fukuoka'] },
  { symbol: 'A$', code: 'AUD', keywords: ['sydney', 'melbourne', 'brisbane', 'australia', 'perth', 'adelaide', 'cairns', 'gold coast'] },
  { symbol: 'C$', code: 'CAD', keywords: ['toronto', 'vancouver', 'canada', 'montreal', 'calgary', 'ottawa', 'quebec'] },
  { symbol: '₹', code: 'INR', keywords: ['mumbai', 'delhi', 'bangalore', 'india', 'goa', 'jaipur', 'agra', 'kolkata', 'chennai', 'hyderabad', 'kerala'] },
  { symbol: 'Rp', code: 'IDR', keywords: ['bali', 'jakarta', 'indonesia', 'lombok', 'yogyakarta', 'surabaya'] },
  { symbol: '฿', code: 'THB', keywords: ['bangkok', 'thailand', 'phuket', 'chiang mai', 'pattaya', 'krabi', 'koh samui'] },
  { symbol: 'د.إ', code: 'AED', keywords: ['dubai', 'abu dhabi', 'uae', 'emirates'] },
  { symbol: 'S$', code: 'SGD', keywords: ['singapore'] },
  { symbol: 'HK$', code: 'HKD', keywords: ['hong kong'] },
  { symbol: '₩', code: 'KRW', keywords: ['seoul', 'korea', 'busan', 'south korea'] },
  { symbol: 'R$', code: 'BRL', keywords: ['brazil', 'rio', 'são paulo', 'sao paulo', 'brazil'] },
  { symbol: 'MXN', code: 'MXN', keywords: ['mexico', 'cancun', 'mexico city', 'guadalajara'] },
  { symbol: 'CHF', code: 'CHF', keywords: ['switzerland', 'zurich', 'geneva', 'bern', 'interlaken'] },
  { symbol: 'NZ$', code: 'NZD', keywords: ['new zealand', 'auckland', 'queenstown', 'wellington'] },
  { symbol: '₫', code: 'VND', keywords: ['vietnam', 'hanoi', 'ho chi minh', 'hoi an', 'da nang'] },
  { symbol: 'RM', code: 'MYR', keywords: ['malaysia', 'kuala lumpur', 'penang'] },
  { symbol: '₱', code: 'PHP', keywords: ['philippines', 'manila', 'cebu', 'palawan', 'boracay'] },
  { symbol: 'ZAR', code: 'ZAR', keywords: ['south africa', 'cape town', 'johannesburg', 'safari'] },
  { symbol: 'EGP', code: 'EGP', keywords: ['egypt', 'cairo', 'luxor', 'hurghada', 'sharm el sheikh'] },
  { symbol: 'TRY', code: 'TRY', keywords: ['turkey', 'istanbul', 'ankara', 'cappadocia', 'antalya'] },
  { symbol: 'MAD', code: 'MAD', keywords: ['morocco', 'marrakech', 'casablanca', 'fez', 'rabat'] },
  { symbol: 'kr', code: 'NOK', keywords: ['norway', 'oslo', 'bergen', 'fjord'] },
  { symbol: 'kr', code: 'SEK', keywords: ['sweden', 'stockholm', 'gothenburg'] },
  { symbol: 'DKK', code: 'DKK', keywords: ['denmark', 'copenhagen'] },
];

export interface CurrencyInfo {
  symbol: string;
  code: string;
}

export function detectCurrency(destination: string): CurrencyInfo {
  const lower = destination.toLowerCase();
  for (const entry of CURRENCY_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { symbol: entry.symbol, code: entry.code };
    }
  }
  // Default to USD
  return { symbol: '$', code: 'USD' };
}
