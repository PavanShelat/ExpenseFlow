import { ParsedExpense, Category, ParsingResult } from '@/types/expense';

// Rule-based parser with pattern matching for common expense formats
// This is the "rule-first" approach mentioned in the PRD to reduce LLM dependency

const AMOUNT_PATTERNS = [
  /\$(\d+(?:\.\d{2})?)/g,           // $15, $15.00
  /(\d+(?:\.\d{2})?)\s*dollars?/gi,  // 15 dollars
  /(\d+(?:\.\d{2})?)\s*(?:USD|usd)/g, // 15 USD
];

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  food: ['lunch', 'dinner', 'breakfast', 'coffee', 'food', 'restaurant', 'meal', 'snack', 'pizza', 'burger', 'groceries', 'grocery', 'eat', 'eating'],
  transport: ['uber', 'lyft', 'taxi', 'fuel', 'gas', 'petrol', 'parking', 'bus', 'train', 'metro', 'subway', 'transport', 'toll'],
  shopping: ['amazon', 'shopping', 'clothes', 'shoes', 'store', 'mall', 'bought', 'purchase'],
  entertainment: ['movie', 'netflix', 'spotify', 'concert', 'game', 'theater', 'entertainment', 'music', 'streaming'],
  utilities: ['electricity', 'water', 'internet', 'phone', 'bill', 'utility', 'utilities', 'rent', 'insurance'],
  health: ['doctor', 'medicine', 'pharmacy', 'hospital', 'health', 'gym', 'fitness', 'medical', 'dentist'],
  travel: ['flight', 'hotel', 'airbnb', 'vacation', 'trip', 'travel', 'booking'],
  other: [],
};

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function extractAmounts(text: string): { amount: number; index: number; match: string }[] {
  const results: { amount: number; index: number; match: string }[] = [];
  
  for (const pattern of AMOUNT_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const amount = parseFloat(match[1]);
      if (amount > 0 && amount < 100000) { // Sanity check
        results.push({
          amount,
          index: match.index,
          match: match[0],
        });
      }
    }
  }
  
  // Sort by index and remove duplicates
  return results
    .sort((a, b) => a.index - b.index)
    .filter((item, index, arr) => 
      index === 0 || item.index !== arr[index - 1].index
    );
}

export function detectCategory(text: string): { category: Category; confidence: number } {
  const lowerText = text.toLowerCase();
  let bestMatch: Category = 'other';
  let highestScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue;
    
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += keyword.length; // Longer matches = higher confidence
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = category as Category;
    }
  }
  
  // Calculate confidence based on match strength
  const confidence = highestScore > 0 
    ? Math.min(0.95, 0.6 + (highestScore * 0.05))
    : 0.4; // Low confidence for "other"
  
  return { category: bestMatch, confidence };
}

function extractDescription(text: string, amount: { amount: number; index: number; match: string }, nextAmount?: { index: number }): string {
  // Find the surrounding context for this amount
  const beforeAmount = text.substring(0, amount.index);
  const afterAmount = text.substring(amount.index + amount.match.length);
  
  // Split by common delimiters
  const delimiters = /(?:,|\band\b|\+|;)/i;
  
  // Get the relevant segment
  let segment = '';
  
  // Look for descriptive words after the amount first
  const afterMatch = afterAmount.match(/^\s*(?:for|on|at)?\s*([^,;+]+?)(?=\s*(?:and|,|\+|$|\$|\d+\s*(?:dollars?|USD)))/i);
  if (afterMatch && afterMatch[1].trim()) {
    segment = afterMatch[1].trim();
  } else {
    // Look before the amount
    const parts = beforeAmount.split(delimiters);
    segment = parts[parts.length - 1].trim();
  }
  
  // Clean up the description
  segment = segment
    .replace(/^\s*(?:spent|paid|for|on|at)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If still no good description, try to extract from the full context
  if (!segment || segment.length < 2) {
    const fullContext = text.replace(AMOUNT_PATTERNS[0], '').trim();
    const words = fullContext.split(/\s+/).filter(w => w.length > 2);
    segment = words.slice(0, 3).join(' ') || 'Expense';
  }
  
  // Capitalize first letter
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function parseExpenses(input: string): ParsingResult {
  const startTime = performance.now();
  
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return {
      success: false,
      expenses: [],
      rawInput: input,
      processingTime: performance.now() - startTime,
    };
  }
  
  const amounts = extractAmounts(trimmedInput);
  
  if (amounts.length === 0) {
    return {
      success: false,
      expenses: [],
      rawInput: input,
      processingTime: performance.now() - startTime,
    };
  }
  
  const expenses: ParsedExpense[] = amounts.map((amountInfo, index) => {
    const description = extractDescription(trimmedInput, amountInfo, amounts[index + 1]);
    const { category, confidence } = detectCategory(description);
    
    return {
      id: generateId(),
      amount: amountInfo.amount,
      description,
      category,
      confidence,
      needsReview: confidence < 0.7,
      date: new Date(),
    };
  });
  
  return {
    success: true,
    expenses,
    rawInput: input,
    processingTime: performance.now() - startTime,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
